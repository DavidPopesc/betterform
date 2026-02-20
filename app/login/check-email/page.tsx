"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginCheckEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const aid = useMemo(() => searchParams.get("aid") || "", [searchParams])
  const email = useMemo(() => searchParams.get("email") || "", [searchParams])

  const [approved, setApproved] = useState(false)
  const [pollError, setPollError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    if (!aid) return

    let cancelled = false

    async function pollStatus() {
      try {
        const res = await fetch(`/api/auth/login/status?aid=${encodeURIComponent(aid)}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          if (!cancelled) setPollError("Unable to check sign-in status right now.")
          return
        }

        const data = await res.json()
        if (cancelled) return

        if (data.rejected) {
          setStatusMessage("Sign-in request was rejected.")
          setApproved(false)
          return
        }

        if (data.expired) {
          setStatusMessage("This sign-in link has expired. Please sign in again.")
          setApproved(false)
          return
        }

        setApproved(Boolean(data.approved))
        if (data.approved) {
          setPollError("")
          setStatusMessage("Email address verified successfully.")
        }
      } catch {
        if (!cancelled) setPollError("Unable to check sign-in status right now.")
      }
    }

    pollStatus()
    const timer = setInterval(pollStatus, 3000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [aid])

  async function completeLogin() {
    setSubmitting(true)
    setPollError("")

    try {
      const res = await fetch("/api/auth/login/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aid }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPollError(data?.error || "Could not complete sign in.")
        setSubmitting(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setPollError("Could not complete sign in.")
      setSubmitting(false)
    }
  }

  if (!aid || !email) {
    return (
      <div className="bg-muted flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid sign in session</CardTitle>
            <CardDescription>Please return to sign in and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")}>Back to sign in</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-muted flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{approved ? "Email address verified successfully." : "Check your email address for a code."}</CardTitle>
          <CardDescription>
            {approved
              ? "Your sign-in request is approved. Continue to your dashboard."
              : `We sent a verification link to ${email}. Open it and choose “Yes, this was me”.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {statusMessage && !approved ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
          {pollError ? <p className="text-destructive text-sm">{pollError}</p> : null}

          {approved ? (
            <Button onClick={completeLogin} disabled={submitting}>
              {submitting ? "Signing in..." : "Continue to dashboard"}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => router.push("/login")}>Back</Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
