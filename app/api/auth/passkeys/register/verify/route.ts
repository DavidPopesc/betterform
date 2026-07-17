import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { type RegistrationResponseJSON } from "@simplewebauthn/server"
import {
  createSession,
  setSessionCookie,
  verifyPendingSignupToken,
  clearPendingSignupCookie,
  PENDING_SIGNUP_COOKIE_NAME,
} from "@/lib/session"
import { verifyRegistrationChallenge } from "@/lib/webauthn"

export async function POST(request: NextRequest) {
  try {
    const {
      uid,
      challengeId,
      credential,
    }: { uid?: string; challengeId?: string; credential?: RegistrationResponseJSON } = await request.json()

    if (!uid || !challengeId || !credential) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const pendingToken = cookieStore.get(PENDING_SIGNUP_COOKIE_NAME)?.value
    if (!pendingToken || !verifyPendingSignupToken(pendingToken, uid)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { default: prisma } = await import("@/lib/db")

    const user = await prisma.account.findUnique({ where: { id: uid } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const existingPasskey = await prisma.passkeyCredential.findFirst({
      where: { userId: uid },
      select: { id: true },
    })
    if (existingPasskey) {
      return NextResponse.json({ error: "Passkey already configured" }, { status: 409 })
    }

    const result = await verifyRegistrationChallenge({ request, userId: uid, challengeId, credential })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const { credential: regCredential, fmt, aaguid } = result.registrationInfo

    await prisma.passkeyCredential.create({
      data: {
        userId: uid,
        credentialId: regCredential.id,
        publicKey: Buffer.from(regCredential.publicKey).toString("base64url"),
        signCount: regCredential.counter,
        transports: regCredential.transports ?? [],
        metadata: { fmt, aaguid },
      },
    })

    const { token, expiresAt } = await createSession(uid)
    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, token, expiresAt)
    clearPendingSignupCookie(res)
    return res
  } catch (error) {
    console.error("Passkey registration verify error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
