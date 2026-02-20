import { NextResponse } from "next/server"
import crypto from "crypto"
import { getLoginApprovalByIdAndTokenHash, markLoginApprovalApproved, markLoginApprovalRejected } from "@/lib/login-approval"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export async function POST(req: Request) {
  try {
    const { aid, token, decision } = await req.json()

    if (!aid || !token || (decision !== "yes" && decision !== "no")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const tokenHash = sha256Hex(token)
    const approval = await getLoginApprovalByIdAndTokenHash(aid, tokenHash)

    if (!approval) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 })
    }

    if (approval.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 400 })
    }

    if (approval.approved || approval.rejected) {
      return NextResponse.json({ ok: true })
    }

    if (decision === "no") {
      await markLoginApprovalRejected(aid)
      return NextResponse.json({ ok: true })
    }

    await markLoginApprovalApproved(aid)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Login decision error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
