import { NextRequest, NextResponse } from "next/server"
import { type RegistrationResponseJSON } from "@simplewebauthn/server"
import { getSessionUser } from "@/lib/auth-server"
import { verifyRegistrationChallenge } from "@/lib/webauthn"

const MAX_NAME_LENGTH = 60

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
    }

    const {
      challengeId,
      credential,
      name,
    }: { challengeId?: string; credential?: RegistrationResponseJSON; name?: string } = await request.json()

    if (!challengeId || !credential) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const result = await verifyRegistrationChallenge({ request, userId: user.id, challengeId, credential })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const { credential: regCredential, fmt, aaguid } = result.registrationInfo
    const trimmedName = typeof name === "string" ? name.trim().slice(0, MAX_NAME_LENGTH) : ""

    const { default: prisma } = await import("@/lib/db")
    const passkey = await prisma.passkeyCredential.create({
      data: {
        userId: user.id,
        name: trimmedName || null,
        credentialId: regCredential.id,
        publicKey: Buffer.from(regCredential.publicKey).toString("base64url"),
        signCount: regCredential.counter,
        transports: regCredential.transports ?? [],
        metadata: { fmt, aaguid },
      },
      select: { id: true, name: true, credentialId: true, transports: true, createdAt: true },
    })

    return NextResponse.json({ ok: true, passkey })
  } catch (error) {
    console.error("Account passkey registration verify error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
