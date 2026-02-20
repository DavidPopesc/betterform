"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DecisionState = "idle" | "loading" | "verified" | "rejected" | "error"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get("t") || "", [searchParams])
  const uid = useMemo(() => searchParams.get("uid") || "", [searchParams])

  const [state, setState] = useState<DecisionState>("idle")
  const [message, setMessage] = useState("")

  const invalid = !token || !uid

  async function submitDecision(decision: "yes" | "no") {
    setState("loading")
    setMessage("")

    try {
      const res = await fetch("/api/auth/verify-email/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, token, decision }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setState("error")
        setMessage(data?.reason ? `Verification failed: ${data.reason}` : "Verification failed.")
        return
      }

      if (decision === "yes") {
        setState("verified")
        setMessage("Email verified, you may close this webpage.")
      } else {
        setState("rejected")
        setMessage("Thanks. This request was marked as not you, and the link is no longer valid.")
      }
    } catch {
      setState("error")
      setMessage("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="bg-muted flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {invalid
              ? "Invalid verification link"
              : state === "verified"
                ? "Email verified"
                : state === "rejected"
                  ? "Request rejected"
                  : "Verify sign up"}
          </CardTitle>
          <CardDescription>
            {invalid
              ? "This link is missing required parameters."
              : state === "idle" || state === "loading"
                ? "Did you just try to sign up to Better Form?"
                : message}
          </CardDescription>
        </CardHeader>
        {!invalid && (state === "idle" || state === "loading") ? (
          <CardContent className="space-y-3">
            <Button disabled={state === "loading"} onClick={() => submitDecision("yes")}>
              Yes, this was me
            </Button>
            <Button type="button" variant="outline" disabled={state === "loading"} onClick={() => submitDecision("no")}>
              No, this was not me
            </Button>
          </CardContent>
        ) : null}
        {!invalid && state === "error" ? (
          <CardContent>
            <p className="text-destructive text-sm">{message}</p>
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}
