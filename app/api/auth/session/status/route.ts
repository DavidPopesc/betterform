import { NextRequest, NextResponse } from "next/server"
import { clearSessionCookie, parseSessionCookie } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("bf_session")?.value

    if (!token) {
      return NextResponse.json({ authenticated: false, hadToken: false, invalidToken: false })
    }

    const { default: prisma } = await import("@/lib/db")
    const parsed = parseSessionCookie(token)
    const session =
      parsed.type === "jwt"
        ? await prisma.session.findFirst({
            where: { id: parsed.payload.sid, userId: parsed.payload.uid, revoked: false },
            include: { user: true },
          })
        : await prisma.session.findFirst({
            where: { tokenHash: parsed.tokenHash, revoked: false },
            include: { user: true },
          })

    if (!session || (session.expiresAt && session.expiresAt < new Date())) {
      const res = NextResponse.json({ authenticated: false, hadToken: true, invalidToken: true })
      clearSessionCookie(res)
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
