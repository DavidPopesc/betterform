import { NextResponse } from "next/server"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { email }: { email?: string } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")
    const user = await prisma.account.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to enumerate registered emails.
    if (user) {
      const latest = await prisma.passwordReset.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })

      const onCooldown = latest ? Date.now() - latest.createdAt.getTime() < 60 * 1000 : false
      if (!onCooldown) {
        await sendPasswordResetEmail(user.id, user.email)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
