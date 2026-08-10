import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { verifyStripeConnectStateToken } from "@/lib/session"

const APP_URL = process.env.APP_URL || "http://localhost:3000"

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`)
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const errorParam = url.searchParams.get("error")

  if (errorParam) {
    return NextResponse.redirect(`${APP_URL}/account?stripe=denied`)
  }

  if (!code || !state || !verifyStripeConnectStateToken(state, user.id)) {
    return NextResponse.redirect(`${APP_URL}/account?stripe=invalid_state`)
  }

  try {
    const { default: stripe } = await import("@/lib/stripe")
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    const stripeAccountId = response.stripe_user_id
    if (!stripeAccountId) {
      throw new Error("Missing stripe_user_id in OAuth token response")
    }

    const connectedAccount = await stripe.accounts.retrieve(stripeAccountId)

    const { default: prisma } = await import("@/lib/db")
    await prisma.account.update({
      where: { id: user.id },
      data: {
        stripeAccountId,
        stripeAccountOnboarded: Boolean(connectedAccount.charges_enabled),
      },
    })

    try {
      await stripe.paymentMethodDomains.create(
        { domain_name: new URL(APP_URL).hostname },
        { stripeAccount: stripeAccountId }
      )
    } catch (domainError) {
      console.error("Stripe payment method domain registration error:", domainError)
    }

    return NextResponse.redirect(`${APP_URL}/account?stripe=connected`)
  } catch (error) {
    console.error("Stripe Connect callback error:", error)
    return NextResponse.redirect(`${APP_URL}/account?stripe=error`)
  }
}

export const dynamic = "force-dynamic"
