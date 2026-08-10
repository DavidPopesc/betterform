import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"

export async function POST() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID
  if (!clientId) {
    console.error("STRIPE_CONNECT_CLIENT_ID is not configured")
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 })
  }

  const { default: prisma } = await import("@/lib/db")
  const account = await prisma.account.findUnique({
    where: { id: user.id },
    select: { stripeAccountId: true },
  })

  if (!account?.stripeAccountId) {
    return NextResponse.json({ connected: false })
  }

  try {
    const { default: stripe } = await import("@/lib/stripe")
    await stripe.oauth.deauthorize({
      client_id: clientId,
      stripe_user_id: account.stripeAccountId,
    })
  } catch (error) {
    // Still proceed to unlink locally even if Stripe's deauthorize call fails
    // (e.g. already revoked on Stripe's side) — the account id would otherwise
    // be stuck pointing at a connection the owner can no longer use anyway.
    console.error("Stripe deauthorize error:", error)
  }

  // A form pointing at a payout destination that no longer exists must not keep
  // charging respondents — force the setting off wherever it was on.
  await prisma.$transaction([
    prisma.account.update({
      where: { id: user.id },
      data: { stripeAccountId: null, stripeAccountOnboarded: false },
    }),
    prisma.form.updateMany({
      where: { accountId: user.id, paymentRequired: true },
      data: { paymentRequired: false },
    }),
  ])

  return NextResponse.json({ connected: false })
}

export const dynamic = "force-dynamic"
