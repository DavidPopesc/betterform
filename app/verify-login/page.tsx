"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DecisionState = "idle" | "loading" | "approved" | "rejected" | "error"

function VerifyLoginContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get("t") || "", [searchParams])
  const aid = useMemo(() => searchParams.get("aid") || "", [searchParams])

  const [state, setState] = useState<DecisionState>("idle")
  const [message, setMessage] = useState("")

  const invalid = !token || !aid

  async function submitDecision(decision: "yes" | "no") {
    setState("loading")
    setMessage("")

    try {
      const res = await fetch("/api/auth/login/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aid, token, decision }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState("error")
        setMessage(data?.error || "Verification failed.")
        return
      }

      if (decision === "yes") {
        setState("approved")
        setMessage("Sign in approved, you may close this webpage.")
      } else {
        setState("rejected")
        setMessage("Sign in request was rejected.")
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
              : state === "approved"
                ? "Sign in approved"
                : state === "rejected"
                  ? "Request rejected"
                  : "Approve sign in"}
          </CardTitle>
          <CardDescription>
            {invalid
              ? "This link is missing required parameters."
              : state === "idle" || state === "loading"
                ? "Did you just try to sign in to Better Form?"
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

export default function VerifyLoginPage() {
  return (
    <Suspense fallback={null}>
      <VerifyLoginContent />
    </Suspense>
  )
}
