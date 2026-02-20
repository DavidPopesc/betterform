import { NextResponse } from "next/server"
import { getLoginApprovalById } from "@/lib/login-approval"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const aid = url.searchParams.get("aid")

    if (!aid) {
      return NextResponse.json({ error: "Missing aid" }, { status: 400 })
    }

    const approval = await getLoginApprovalById(aid)

    if (!approval) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
    }

    const expired = approval.expiresAt < new Date()
    return NextResponse.json({
      ok: true,
      approved: approval.approved,
      rejected: approval.rejected,
      expired,
    })
  } catch (error) {
    console.error("Login status error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
