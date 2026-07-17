import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import { verifyPendingSignupToken, PENDING_SIGNUP_COOKIE_NAME } from "@/lib/session"
import { getRpId, RP_NAME } from "@/lib/webauthn"

export async function POST(request: NextRequest) {
  try {
    const { uid }: { uid?: string } = await request.json()
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const pendingToken = cookieStore.get(PENDING_SIGNUP_COOKIE_NAME)?.value
    if (!pendingToken || !verifyPendingSignupToken(pendingToken, uid)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { default: prisma } = await import("@/lib/db")
    const user = await prisma.account.findUnique({ where: { id: uid }, select: { id: true, email: true } })
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

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: getRpId(request),
      userName: user.email,
      userDisplayName: user.email,
      attestationType: "none",
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    })

    const challengeRow = await prisma.webAuthnChallenge.create({
      data: {
        userId: uid,
        challenge: options.challenge,
        type: "registration",
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      },
    })

    return NextResponse.json({ challengeId: challengeRow.id, options })
  } catch (error) {
    console.error("Passkey registration options error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
