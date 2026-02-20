import { NextResponse } from "next/server"
import { verifyPassword } from "@/lib/auth"
import { sendLoginApprovalEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const { default: prisma } = await import('@/lib/db')
    const user = await prisma.account.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const ok = await verifyPassword(user.passwordHash, password)
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const verified = await prisma.emailVerification.findFirst({
      where: { userId: user.id, used: true },
      select: { id: true },
    })
    if (!verified) {
      return NextResponse.json({ error: "Please verify your email before signing in" }, { status: 403 })
    }

    const approvalId = crypto.randomUUID()
    await sendLoginApprovalEmail(user.id, user.email, approvalId)

    return NextResponse.json({ ok: true, pendingApproval: true, approvalId, email: user.email })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
