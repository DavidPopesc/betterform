"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function RequestResetForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("loading")

    try {
      await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Intentionally ignore network errors here too — we always show the
      // same generic confirmation regardless of outcome.
    } finally {
      setStatus("sent")
    }
  }

  if (status === "sent") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for {email}, we sent a link to reset your password. The link expires in 1 hour.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your account email and we&apos;ll send you a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <Button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Sending..." : "Send reset link"}
              </Button>
              <FieldDescription className="text-center">
                <a href="/login">Back to sign in</a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function ConfirmResetForm({ token, uid }: { token: string; uid: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage("")

    if (password !== confirmPassword) {
      setStatus("error")
      setErrorMessage("Passwords do not match.")
      return
    }

    setStatus("loading")

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, token, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus("error")
        setErrorMessage(
          data?.error === "expired"
            ? "This reset link has expired. Please request a new one."
            : data?.error === "used"
              ? "This reset link has already been used."
              : data?.error === "invalid"
                ? "This reset link is invalid."
                : data?.error || "Could not reset your password."
        )
        return
      }

      setStatus("success")
      router.push("/dashboard")
      router.refresh()
    } catch {
      setStatus("error")
      setErrorMessage("Something went wrong. Please try again.")
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Enter a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <Field>
              <Button type="submit" disabled={status === "loading" || status === "success"}>
                {status === "loading" ? "Resetting..." : "Reset password"}
              </Button>
              {status === "error" && errorMessage ? (
                <FieldDescription className="text-destructive text-center">{errorMessage}</FieldDescription>
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get("t") || "", [searchParams])
  const uid = useMemo(() => searchParams.get("uid") || "", [searchParams])

  return (
    <div className="bg-muted flex min-h-svh items-center justify-center p-6">
      {token && uid ? <ConfirmResetForm token={token} uid={uid} /> : <RequestResetForm />}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
