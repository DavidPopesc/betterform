import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createRegistrationChallenge } from "@/lib/webauthn"

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
    }

    const { default: prisma } = await import("@/lib/db")
    const existingPasskeys = await prisma.passkeyCredential.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    })

    const { challengeId, options } = await createRegistrationChallenge({
      request,
      userId: user.id,
      userEmail: user.email,
      excludeCredentials: existingPasskeys.map((p) => ({ id: p.credentialId, transports: p.transports })),
    })

    return NextResponse.json({ challengeId, options })
  } catch (error) {
    console.error("Account passkey registration options error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
