import { NextResponse } from "next/server"
import crypto from "crypto"
import { getLoginApprovalById } from "@/lib/login-approval"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export async function POST(req: Request) {
  try {
    const { aid } = await req.json()
    if (!aid) {
      return NextResponse.json({ error: "Missing aid" }, { status: 400 })
    }

    const approval = await getLoginApprovalById(aid)

    if (!approval) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
    }

    if (approval.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 400 })
    }

    if (!approval.approved || approval.rejected) {
      return NextResponse.json({ error: "Login not approved" }, { status: 403 })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 730)

    const { default: prisma } = await import("@/lib/db")
    await prisma.session.create({ data: { userId: approval.userId, tokenHash, expiresAt } })

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
    console.error("Login completion error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
