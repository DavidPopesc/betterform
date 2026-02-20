import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { default: prisma } = await import("@/lib/db")
    const count = await prisma.passkeyCredential.count()
    return NextResponse.json({ exists: count > 0 })
  } catch (error) {
    console.error("Passkey global check failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
