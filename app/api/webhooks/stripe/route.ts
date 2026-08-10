import { NextResponse } from 'next/server'
import { finalizePendingSubmission } from '@/lib/pending-submission'

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  const rawBody = await req.text()

  const { default: stripe } = await import('@/lib/stripe')
  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // Safety net for the "paid but the client's return-call never fired" case — the
      // client-side confirmPayment path already finalizes the same submission, so this
      // is expected to frequently be a no-op (finalizePendingSubmission is idempotent).
      case 'payment_intent.succeeded': {
        const paymentIntentId = event.data.object.id
        const result = await finalizePendingSubmission(paymentIntentId)
        if (!result.ok) {
          console.error('Webhook finalize failed:', paymentIntentId, result.error)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object
        const { default: prisma } = await import('@/lib/db')
        await prisma.account.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeAccountOnboarded: Boolean(account.charges_enabled) },
        })
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Stripe webhook handling error:', err)
    // Still acknowledge receipt — Stripe retries on non-2xx, and a transient error here
    // (e.g. a DB blip) shouldn't cause Stripe to keep hammering this endpoint indefinitely
    // when payment_intent.succeeded already has the client-side finalize as the primary path.
  }

  return NextResponse.json({ received: true })
}

export const dynamic = 'force-dynamic'
