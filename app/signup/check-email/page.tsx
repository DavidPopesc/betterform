"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

function SignupCheckEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const uid = useMemo(() => searchParams.get("uid") || "", [searchParams])
  const email = useMemo(() => searchParams.get("email") || "", [searchParams])
  const emailSent = useMemo(() => searchParams.get("emailSent") !== "0", [searchParams])

  const [verified, setVerified] = useState(false)
  const [hasPasskey, setHasPasskey] = useState(false)
  const [pollError, setPollError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [passkeyError, setPasskeyError] = useState("")
  const [emailStatus, setEmailStatus] = useState(
    emailSent ? "" : "Failed to send email please try again."
  )
  const [resendCooldown, setResendCooldown] = useState(emailSent ? 60 : 0)

  useEffect(() => {
    if (!uid) return

    let cancelled = false

    async function pollStatus() {
      try {
        const res = await fetch(`/api/auth/signup/status?uid=${encodeURIComponent(uid)}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          if (!cancelled) setPollError("Unable to check verification status right now.")
          return
        }

        const data = await res.json()
        if (!cancelled) {
          setVerified(Boolean(data.verified))
          setHasPasskey(Boolean(data.hasPasskey))
          if (data.verified) setPollError("")
        }
      } catch {
        if (!cancelled) setPollError("Unable to check verification status right now.")
      }
    }

    pollStatus()
    const timer = setInterval(pollStatus, 3000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [uid])

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  async function finalizeSignup() {
    setSubmitting(true)
    setPasskeyError("")

    try {
      const res = await fetch("/api/auth/signup/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid }),
      })

      if (!res.ok) {
        setPasskeyError("Could not complete sign up. Please try again.")
        setSubmitting(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setPasskeyError("Could not complete sign up. Please try again.")
      setSubmitting(false)
    }
  }

  async function setupPasskey() {
    if (!uid || !email) {
      setPasskeyError("Missing signup details. Please sign up again.")
      return
    }

    if (!("credentials" in navigator) || typeof window.PublicKeyCredential === "undefined") {
      setPasskeyError("Passkeys are not available in this browser. You can skip this step.")
      return
    }

    setSubmitting(true)
    setPasskeyError("")

    try {
      const optionsRes = await fetch("/api/auth/passkeys/register/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid }),
      })

      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}))
        setPasskeyError(
          data?.error === "Passkey already configured"
            ? "This account already has a passkey set up."
            : "Could not start passkey setup. Please try again."
        )
        setSubmitting(false)
        return
      }

      const { challengeId, options } = await optionsRes.json()

      const credential = (await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: fromBase64Url(options.challenge),
          user: {
            ...options.user,
            id: fromBase64Url(options.user.id),
          },
          excludeCredentials: (options.excludeCredentials || []).map(
            (item: { id: string; transports?: string[] }) => ({
              ...item,
              id: fromBase64Url(item.id),
            })
          ),
        },
      })) as PublicKeyCredential | null

      if (!credential) {
        setPasskeyError("Passkey setup was cancelled.")
        setSubmitting(false)
        return
      }

      const response = credential.response as AuthenticatorAttestationResponse
      const credentialJSON = {
        id: credential.id,
        rawId: toBase64Url(new Uint8Array(credential.rawId)),
        type: credential.type,
        response: {
          clientDataJSON: toBase64Url(new Uint8Array(response.clientDataJSON)),
          attestationObject: toBase64Url(new Uint8Array(response.attestationObject)),
          transports: response.getTransports ? response.getTransports() : undefined,
        },
        clientExtensionResults: credential.getClientExtensionResults
          ? credential.getClientExtensionResults()
          : {},
      }

      const verifyRes = await fetch("/api/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, challengeId, credential: credentialJSON }),
      })

      if (!verifyRes.ok) {
        setPasskeyError("Passkey setup failed. You can try again or skip.")
        setSubmitting(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setPasskeyError("Passkey setup failed. You can try again or skip.")
      setSubmitting(false)
    }
  }

  async function resendVerificationEmail() {
    setEmailStatus("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/auth/signup/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, email }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (typeof data?.retryAfter === "number") {
          setResendCooldown(data.retryAfter)
        }
        setEmailStatus(data?.error || "Failed to send email please try again.")
        setSubmitting(false)
        return
      }

      if (data?.alreadyVerified) {
        setVerified(true)
        setEmailStatus("")
        setSubmitting(false)
        return
      }

      setEmailStatus("Verification email sent.")
      setResendCooldown(typeof data?.retryAfter === "number" ? data.retryAfter : 60)
    } catch {
      setEmailStatus("Failed to send email please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!uid || !email) {
    return (
      <div className="bg-muted flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid sign up session</CardTitle>
            <CardDescription>Please return to sign up and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/signup")}>Back to sign up</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-muted flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {verified ? "Email address verified successfully." : "Check your email address for a code."}
          </CardTitle>
          <CardDescription>
            {verified
              ? hasPasskey
                ? "Your email is confirmed and your passkey is already set up. Continue to your dashboard."
                : "Set up a passkey now, or continue with email approval as your fallback sign-in method."
              : `We sent a verification link to ${email}. Open it and choose “Yes, this was me”.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {pollError ? <p className="text-destructive text-sm">{pollError}</p> : null}
          {emailStatus ? (
            <p className={emailStatus.startsWith("Failed") ? "text-destructive text-sm" : "text-sm text-muted-foreground"}>
              {emailStatus}
            </p>
          ) : null}

          {verified ? (
            <div className="space-y-3 text-center">
              {!hasPasskey ? (
                <Button onClick={setupPasskey} disabled={submitting}>
                  {submitting ? "Processing..." : "Set up passkey"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => finalizeSignup()} disabled={submitting}>
                Continue to dashboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={resendVerificationEmail}
                disabled={submitting || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend email after 1 min (${resendCooldown}s)` : "Resend email"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/signup")}>
                Back
              </Button>
            </div>
          )}

          {passkeyError ? <p className="text-destructive text-sm pt-1">{passkeyError}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupCheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <SignupCheckEmailContent />
    </Suspense>
  )
}
