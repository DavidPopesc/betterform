import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const existing = await prisma.account.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

    const passwordHash = await hashPassword(password)
    const user = await prisma.account.create({ data: { email, passwordHash } })

    // send magic link email (async)
    try {
      await sendVerificationEmail(user.id, email)
    } catch (err) {
      // log but don't leak details to client
      console.error("sendVerificationEmail failed", err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
