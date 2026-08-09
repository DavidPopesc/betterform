'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type StripePaymentStepProps = {
  publicId: string
  clientSecret: string
  connectedAccountId: string
  onSuccess: (responseId: string) => void
  onCancel: () => void
}

function PaymentForm({
  publicId,
  onSuccess,
  onCancel,
}: Pick<StripePaymentStepProps, 'publicId' | 'onSuccess' | 'onCancel'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handlePay(e: FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setError('')

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.')
      setSubmitting(false)
      return
    }

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      setError('Payment was not completed. Please try again.')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/submit/${publicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(
          data.message ||
            'Payment succeeded, but we could not record your response. Please contact the form owner.'
        )
        setSubmitting(false)
        return
      }

      onSuccess(data.responseId)
    } catch {
      setError('Payment succeeded, but we could not record your response. Please contact the form owner.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />

      {error ? (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Back
        </Button>
        <Button type="submit" disabled={!stripe || submitting}>
          {submitting ? 'Processing...' : 'Pay & Submit'}
        </Button>
      </div>
    </form>
  )
}

export default function StripePaymentStep({
  publicId,
  clientSecret,
  connectedAccountId,
  onSuccess,
  onCancel,
}: StripePaymentStepProps) {
  const stripePromise = useMemo(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) return null
    // Must be scoped to the connected account — the PaymentIntent behind this
    // client secret was created directly on that account (a direct charge),
    // not on the platform account.
    return loadStripe(publishableKey, { stripeAccount: connectedAccountId })
  }, [connectedAccountId])

  if (!stripePromise) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">
          Payments are not configured correctly. Please contact the form owner.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">Payment</h3>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm publicId={publicId} onSuccess={onSuccess} onCancel={onCancel} />
      </Elements>
    </Card>
  )
}
