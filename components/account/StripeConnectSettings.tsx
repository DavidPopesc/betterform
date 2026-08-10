"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CreditCard, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type StripeStatus = {
  connected: boolean
  onboarded: boolean
  accountId: string | null
}

const CALLBACK_MESSAGES: Record<string, string> = {
  denied: "Stripe connection was cancelled.",
  invalid_state: "That connection attempt expired or was invalid — please try again.",
  error: "Something went wrong connecting your Stripe account. Please try again.",
}

export default function StripeConnectSettings({ initialStatus }: { initialStatus: StripeStatus }) {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<StripeStatus>(initialStatus)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const stripeParam = searchParams.get("stripe")
    if (stripeParam && stripeParam !== "connected") {
      setError(CALLBACK_MESSAGES[stripeParam] || "")
    }
    if (stripeParam === "connected") {
      // The callback route already persisted the connection; re-fetch to reflect it.
      fetch("/api/account/stripe/status")
        .then((res) => res.json())
        .then((data) => setStatus(data))
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function connect() {
    setError("")
    setConnecting(true)
    try {
      const res = await fetch("/api/account/stripe/connect", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data?.error || "Could not start Stripe connection.")
        setConnecting(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError("Could not start Stripe connection.")
      setConnecting(false)
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect your Stripe account? Any forms requiring payment will stop accepting payments.")) {
      return
    }

    setError("")
    setDisconnecting(true)
    try {
      const res = await fetch("/api/account/stripe/disconnect", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Could not disconnect Stripe.")
        return
      }
      setStatus({ connected: false, onboarded: false, accountId: null })
    } catch {
      setError("Could not disconnect Stripe.")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>
          Connect your Stripe account to accept payments before someone can submit a form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.connected ? (
          <div className="flex items-center justify-between gap-3 rounded-md border px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-sm font-medium">Stripe connected</div>
                <div className="text-xs text-muted-foreground truncate">{status.accountId}</div>
                {!status.onboarded ? (
                  <div className="text-xs text-amber-600">
                    Onboarding isn&apos;t finished yet — finish setup in your Stripe dashboard before
                    enabling payments on a form.
                  </div>
                ) : null}
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={disconnecting} onClick={disconnect}>
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={connect} disabled={connecting}>
            {connecting ? (
              "Redirecting to Stripe..."
            ) : (
              <>
                Connect Stripe
                <ExternalLink className="h-4 w-4" />
              </>
            )}
          </Button>
        )}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
