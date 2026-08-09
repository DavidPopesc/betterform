import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createStripeConnectStateToken } from "@/lib/session"

const APP_URL = process.env.APP_URL || "http://localhost:3000"

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

  const state = createStripeConnectStateToken(user.id)
  const redirectUri = `${APP_URL}/api/account/stripe/callback`

  const { default: stripe } = await import("@/lib/stripe")
  const url = stripe.oauth.authorizeUrl({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state,
    stripe_user: { email: user.email },
  })

  return NextResponse.json({ url })
}

export const dynamic = "force-dynamic"
