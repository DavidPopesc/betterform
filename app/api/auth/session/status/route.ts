import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("bf_session")?.value

    if (!token) {
      return NextResponse.json({ authenticated: false, hadToken: false, invalidToken: false })
    }

    const tokenHash = sha256Hex(token)
    const { default: prisma } = await import("@/lib/db")
    const session = await prisma.session.findFirst({
      where: { tokenHash, revoked: false },
      include: { user: true },
    })

    if (!session || (session.expiresAt && session.expiresAt < new Date())) {
      const res = NextResponse.json({ authenticated: false, hadToken: true, invalidToken: true })
      res.cookies.set({
        name: "bf_session",
        value: "",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      })
      return res
    }

    return NextResponse.json({
      authenticated: true,
      hadToken: true,
      invalidToken: false,
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
    })
  } catch (error) {
    console.error("Session status check failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
