"use client"
import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [status, setStatus] = useState<null | "checking" | "idle" | "loading" | "error">("checking")

  useEffect(() => {
    let cancelled = false

    async function precheck() {
      try {
        const sessionRes = await fetch("/api/auth/session/status", { cache: "no-store" })
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          if (sessionData.authenticated) {
            if (!cancelled) setStatus("loading")
            router.push("/dashboard")
            return
          }
        }

        if (!cancelled) setStatus("idle")
      } catch {
        if (!cancelled) {
          setStatus("idle")
        }
      }
    }

    precheck()
    return () => {
      cancelled = true
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("loading")
    const form = new FormData(e.currentTarget)
    const name = String(form.get("name") || "")
    const email = String(form.get("email") || "")
    const password = String(form.get("password") || "")
    const confirm = String(form.get("confirm-password") || "")

    if (!email || !password) {
      setStatus("error")
      return
    }
    if (password !== confirm) {
      setStatus("error")
      return
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        setStatus("error")
        return
      }
      const data = await res.json()
      const uid = String(data.userId || "")
      if (!uid) {
        setStatus("error")
        return
      }
      router.push(
        `/signup/check-email?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}&emailSent=${data.emailSent ? "1" : "0"}`
      )
      setStatus("loading")
    } catch {
      setStatus("error")
    }
  }

  if (status === "checking") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Checking your account...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Creating your account...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input id="name" name="name" type="text" placeholder="John Doe" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input id="password" name="password" type="password" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input id="confirm-password" name="confirm-password" type="password" required />
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit">Create Account</Button>
                {status === "error" ? (
                  <FieldDescription className="text-destructive text-center">
                    Sign up failed. Please check your details and try again.
                  </FieldDescription>
                ) : null}
                <FieldDescription className="text-center">
                  Already have an account? <a href="/login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
