import { NextResponse } from "next/server"
import crypto from "crypto"
import { hashPassword } from "@/lib/auth"
import { createSession, setSessionCookie } from "@/lib/session"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export async function POST(req: Request) {
  try {
    const { uid, token, password }: { uid?: string; token?: string; password?: string } = await req.json()

    if (!uid || !token || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")
    const tokenHash = sha256Hex(token)
    const row = await prisma.passwordReset.findFirst({ where: { userId: uid, tokenHash } })

    if (!row) {
      return NextResponse.json({ error: "invalid" }, { status: 400 })
    }
    if (row.used) {
      return NextResponse.json({ error: "used" }, { status: 400 })
    }
    if (row.expiresAt < new Date()) {
      return NextResponse.json({ error: "expired" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    // Reset the password, consume the token, and revoke every existing
    // session for the account — a password reset is a recovery action and
    // should not leave a potentially-compromised session alive elsewhere.
    await prisma.$transaction([
      prisma.account.update({ where: { id: uid }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: row.id }, data: { used: true } }),
      prisma.session.updateMany({ where: { userId: uid, revoked: false }, data: { revoked: true } }),
    ])

    const { token: sessionToken, expiresAt } = await createSession(uid)
    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, sessionToken, expiresAt)
    return res
  } catch (error) {
    console.error("Password reset confirm error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
