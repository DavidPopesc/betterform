import { NextResponse } from "next/server"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { uid, email } = (await req.json()) as { uid?: string; email?: string }

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing signup details" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")
    const user = await prisma.account.findUnique({
      where: { id: uid },
      select: { id: true, email: true },
    })

    if (!user || user.email !== email) {
      return NextResponse.json({ error: "Sign up session not found" }, { status: 404 })
    }

    const verified = await prisma.emailVerification.findFirst({
      where: { userId: uid, used: true },
      select: { id: true },
    })
    if (verified) {
      return NextResponse.json({ ok: true, alreadyVerified: true })
    }

    const latest = await prisma.emailVerification.findFirst({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })

    if (latest) {
      const retryAfter = 60 - Math.floor((Date.now() - latest.createdAt.getTime()) / 1000)
      if (retryAfter > 0) {
        return NextResponse.json(
          { error: "Please wait before resending", retryAfter },
          { status: 429 }
        )
      }
    }

    await sendVerificationEmail(uid, email)

    return NextResponse.json({ ok: true, retryAfter: 60 })
  } catch (error) {
    console.error("Signup resend error:", error)
    return NextResponse.json(
      { error: "Failed to send email please try again." },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
