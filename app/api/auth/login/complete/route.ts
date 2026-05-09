import { NextResponse } from "next/server"
import { getLoginApprovalById } from "@/lib/login-approval"
import { createSession, setSessionCookie } from "@/lib/session"

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

    const { token, expiresAt } = await createSession(approval.userId)

    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, token, expiresAt)
    return res
  } catch (error) {
    console.error("Login completion error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
