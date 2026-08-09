import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const { default: prisma } = await import("@/lib/db")
  const account = await prisma.account.findUnique({
    where: { id: user.id },
    select: { stripeAccountId: true, stripeAccountOnboarded: true },
  })

  return NextResponse.json({
    connected: Boolean(account?.stripeAccountId),
    onboarded: Boolean(account?.stripeAccountOnboarded),
    accountId: account?.stripeAccountId ?? null,
  })
}

export const dynamic = "force-dynamic"
