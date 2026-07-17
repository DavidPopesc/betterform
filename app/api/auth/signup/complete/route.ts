import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  createSession,
  setSessionCookie,
  verifyPendingSignupToken,
  clearPendingSignupCookie,
  PENDING_SIGNUP_COOKIE_NAME,
} from "@/lib/session"

export async function POST(req: Request) {
  try {
    const { uid }: { uid?: string } = await req.json()

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const pendingToken = cookieStore.get(PENDING_SIGNUP_COOKIE_NAME)?.value
    if (!pendingToken || !verifyPendingSignupToken(pendingToken, uid)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { default: prisma } = await import("@/lib/db")
    const user = await prisma.account.findUnique({ where: { id: uid } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const verified = await prisma.emailVerification.findFirst({
      where: { userId: uid, used: true },
      select: { id: true },
    })
    if (!verified) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 })
    }

    const { token, expiresAt } = await createSession(user.id)

    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, token, expiresAt)
    clearPendingSignupCookie(res)

    return res
  } catch (error) {
    console.error("Signup completion error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
