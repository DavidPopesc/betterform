import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    if (!name || !email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const { default: prisma } = await import('@/lib/db')
    const existing = await prisma.account.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

    const passwordHash = await hashPassword(password)
    const user = await prisma.account.create({ data: { email, name, passwordHash } })

    // send magic link email (async)
    let emailSent = true
    try {
      await sendVerificationEmail(user.id, email)
    } catch (err) {
      emailSent = false
      console.error("sendVerificationEmail failed", err)
    }

    return NextResponse.json({ ok: true, userId: user.id, email: user.email, emailSent })
  } catch (err) {
    console.error('Signup error:', err)
    // safely log stack if present, otherwise stringify
    if (err instanceof Error) {
      console.error(err.stack)
    } else {
      console.error(String(err))
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
