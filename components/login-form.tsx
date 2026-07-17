"use client"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  // FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [status, setStatus] = useState<null | "idle" | "checking" | "loading" | "error">("checking")
  const [errorMessage, setErrorMessage] = useState("")
  const [hasPasskeyRegistered, setHasPasskeyRegistered] = useState(false)
  const attemptedPasskeyRef = useRef(false)

  function toBase64Url(bytes: Uint8Array) {
    let binary = ""
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  }

  function fromBase64Url(value: string) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4)
    const binary = atob(normalized + padding)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }

  const startPasskeyLogin = useCallback(async () => {
    if (!("credentials" in navigator) || typeof window.PublicKeyCredential === "undefined") {
      return false
    }

    try {
      setStatus("loading")
      const optionsRes = await fetch("/api/auth/passkeys/assert/options/discoverable", {
        method: "POST",
        headers: { "content-type": "application/json" },
      })

      if (!optionsRes.ok) {
        setStatus("idle")
        return false
      }

      const optionsData = await optionsRes.json()
      const challengeId = String(optionsData.challengeId || "")
      const challenge = String(optionsData.challenge || "")
      if (!challengeId || !challenge) {
        setStatus("idle")
        return false
      }

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: fromBase64Url(challenge),
          timeout: Number(optionsData.timeout || 60000),
          rpId: String(optionsData.rpId || window.location.hostname),
          userVerification: "preferred",
        },
      })) as PublicKeyCredential | null

      if (!assertion) {
        setStatus("idle")
        return false
      }

      const response = assertion.response as AuthenticatorAssertionResponse
      const credentialJSON = {
        id: assertion.id,
        rawId: toBase64Url(new Uint8Array(assertion.rawId)),
        type: assertion.type,
        response: {
          clientDataJSON: toBase64Url(new Uint8Array(response.clientDataJSON)),
          authenticatorData: toBase64Url(new Uint8Array(response.authenticatorData)),
          signature: toBase64Url(new Uint8Array(response.signature)),
          userHandle: response.userHandle ? toBase64Url(new Uint8Array(response.userHandle)) : undefined,
        },
        clientExtensionResults: assertion.getClientExtensionResults
          ? assertion.getClientExtensionResults()
          : {},
      }

      const verifyRes = await fetch("/api/auth/passkeys/assert/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, credential: credentialJSON }),
      })

      if (!verifyRes.ok) {
        setStatus("idle")
        return false
      }

      router.push("/dashboard")
      router.refresh()
      return true
    } catch {
      setStatus("idle")
      return false
    }
  }, [router])

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
          if (sessionData.invalidToken && !cancelled) {
            setErrorMessage("An invalid session was removed. Please sign in again.")
          }
        }

        const passkeyRes = await fetch("/api/auth/passkeys/exists-global", { cache: "no-store" })
        if (passkeyRes.ok) {
          const passkeyData = await passkeyRes.json()
          if (!cancelled) {
            const hasPasskey = Boolean(passkeyData.exists)
            setHasPasskeyRegistered(hasPasskey)
            if (hasPasskey && !attemptedPasskeyRef.current) {
              attemptedPasskeyRef.current = true
              const signedIn = await startPasskeyLogin()
              if (signedIn) return
            }
          }
        }

        if (!cancelled) setStatus("idle")
      } catch {
        if (!cancelled) {
          setStatus("idle")
          setErrorMessage("Unable to run sign-in checks. Please continue signing in.")
        }
      }
    }

    precheck()
    return () => {
      cancelled = true
    }
  }, [router, startPasskeyLogin])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("loading")
    setErrorMessage("")
    const form = new FormData(e.currentTarget)
    const email = String(form.get("email") || "")
    const password = String(form.get("password") || "")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        const data = await res.json()
        const approvalId = String(data.approvalId || "")
        if (!approvalId) {
          setStatus("error")
          setErrorMessage("Sign in failed. Please try again.")
          return
        }
        router.push(`/login/check-email?aid=${encodeURIComponent(approvalId)}&email=${encodeURIComponent(email)}`)
      setStatus("loading")
      } else {
        const data = await res.json().catch(() => ({}))
        setStatus("error")
        setErrorMessage(data?.error || "Sign in failed. Please check your credentials.")
      }
    } catch {
      setStatus("error")
      setErrorMessage("Sign in failed. Please try again.")
    }
  }

  if (status === "checking") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Checking sign in status...</CardTitle>
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
            <CardTitle className="text-xl">Signing you in...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username webauthn"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="/reset-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit">Sign in</Button>
                {hasPasskeyRegistered ? (
                  <FieldDescription className="text-center">
                    A passkey is registered on this site. We attempted passkey sign in automatically.
                  </FieldDescription>
                ) : null}
                {status === "error" && errorMessage ? (
                  <FieldDescription className="text-destructive text-center">{errorMessage}</FieldDescription>
                ) : null}
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="/terms">Terms of Service</a>{" "}
        and <a href="/privacy">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
