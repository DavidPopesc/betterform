import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ passkeyId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
    }

    const { passkeyId } = await params
    if (!passkeyId) {
      return NextResponse.json({ error: "invalid_passkey_id" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")
    const passkey = await prisma.passkeyCredential.findUnique({
      where: { id: passkeyId },
      select: { id: true, userId: true },
    })

    if (!passkey || passkey.userId !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    await prisma.passkeyCredential.delete({ where: { id: passkeyId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Account passkey delete error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
