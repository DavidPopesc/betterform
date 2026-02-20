import { NextResponse } from "next/server"
import crypto from "crypto"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(normalized + padding, "base64")
}

export async function POST(req: Request) {
  try {
    const {
      challengeId,
      credentialId,
      clientDataJSON,
    }: {
      challengeId?: string
      credentialId?: string
      clientDataJSON?: string
    } = await req.json()

    if (!challengeId || !credentialId || !clientDataJSON) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")

    const challengeRow = await prisma.webAuthnChallenge.findUnique({ where: { id: challengeId } })
    if (!challengeRow || challengeRow.type !== "assertion") {
      return NextResponse.json({ error: "Invalid challenge" }, { status: 400 })
    }

    if (challengeRow.expiresAt < new Date()) {
      return NextResponse.json({ error: "Challenge expired" }, { status: 400 })
    }

    const clientData = JSON.parse(fromBase64Url(clientDataJSON).toString("utf8")) as {
      type?: string
      challenge?: string
    }

    if (clientData.type !== "webauthn.get") {
      return NextResponse.json({ error: "Invalid assertion type" }, { status: 400 })
    }

    if (clientData.challenge !== challengeRow.challenge) {
      return NextResponse.json({ error: "Challenge mismatch" }, { status: 400 })
    }

    const passkey = await prisma.passkeyCredential.findUnique({ where: { credentialId } })
    if (!passkey) {
      return NextResponse.json({ error: "Passkey not recognized" }, { status: 401 })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 730)

    await prisma.session.create({ data: { userId: passkey.userId, tokenHash, expiresAt } })

    await prisma.webAuthnChallenge.delete({ where: { id: challengeId } }).catch(() => {})

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
    console.error("Passkey assertion verify error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
