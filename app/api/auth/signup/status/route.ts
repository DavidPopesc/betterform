import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const uid = url.searchParams.get("uid")

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")
    const user = await prisma.account.findUnique({ where: { id: uid }, select: { id: true } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const verified = await prisma.emailVerification.findFirst({
      where: { userId: uid, used: true },
      select: { id: true },
    })

    return NextResponse.json({ ok: true, verified: Boolean(verified) })
  } catch (error) {
    console.error("Signup status error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
