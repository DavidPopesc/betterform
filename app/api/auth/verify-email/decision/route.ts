import { NextResponse } from "next/server"
import crypto from "crypto"
import { verifyEmailToken } from "@/lib/email"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export async function POST(req: Request) {
  try {
    const { uid, token, decision } = await req.json()

    if (!uid || !token || (decision !== "yes" && decision !== "no")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")

    if (decision === "no") {
      const tokenHash = sha256Hex(token)
      const row = await prisma.emailVerification.findFirst({ where: { userId: uid, tokenHash } })
      if (!row) {
        return NextResponse.json({ error: "Invalid link" }, { status: 400 })
      }

      if (!row.used) {
        await prisma.emailVerification.update({
          where: { id: row.id },
          data: { used: true },
        })
      }

      return NextResponse.json({ ok: true, message: "Verification was rejected" })
    }

    const result = await verifyEmailToken(uid, token)
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: "Email verified" })
  } catch (error) {
    console.error("Verification decision error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
