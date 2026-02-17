import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { verifyPassword } from "@/lib/auth"
import crypto from "crypto"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const user = await prisma.account.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const ok = await verifyPassword(user.passwordHash, password)
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    // create session token
    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 730) // 730 days (2 years)

    await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } })

    const res = NextResponse.json({ ok: true })
    // set cookie
    res.cookies.set({ name: "bf_session", value: token, httpOnly: true, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7 })

    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
