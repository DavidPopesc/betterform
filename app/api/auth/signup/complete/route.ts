import { NextResponse } from "next/server"
import crypto from "crypto"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

type PasskeyPayload = {
  credentialId: string
  publicKey?: string | null
  signCount?: number
  transports?: string[]
  metadata?: unknown
}

export async function POST(req: Request) {
  try {
    const { uid, passkey }: { uid?: string; passkey?: PasskeyPayload } = await req.json()

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")
    const user = await prisma.account.findUnique({ where: { id: uid } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const verified = await prisma.emailVerification.findFirst({
      where: { userId: uid, used: true },
      select: { id: true },
    })
    if (!verified) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 })
    }

    if (passkey?.credentialId) {
      await prisma.passkeyCredential.upsert({
        where: { credentialId: passkey.credentialId },
        create: {
          userId: user.id,
          credentialId: passkey.credentialId,
          publicKey: passkey.publicKey || "",
          signCount: passkey.signCount ?? 0,
          transports: Array.isArray(passkey.transports) ? passkey.transports : [],
          metadata: passkey.metadata ?? {},
        },
        update: {
          userId: user.id,
          publicKey: passkey.publicKey || "",
          signCount: passkey.signCount ?? 0,
          transports: Array.isArray(passkey.transports) ? passkey.transports : [],
          metadata: passkey.metadata ?? {},
        },
      })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 730)

    await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } })

    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name: "bf_session",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 10,
    })

    return res
  } catch (error) {
    console.error("Signup completion error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
