"use client"

import { useEffect, useMemo, useState } from "react"
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

function toBytesFromString(value: string) {
  const bytes = new TextEncoder().encode(value)
  if (bytes.length >= 16) return bytes.slice(0, 16)
  const padded = new Uint8Array(16)
  padded.set(bytes)
  return padded
}

export default function SignupCheckEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const uid = useMemo(() => searchParams.get("uid") || "", [searchParams])
  const email = useMemo(() => searchParams.get("email") || "", [searchParams])

  const [verified, setVerified] = useState(false)
  const [pollError, setPollError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [passkeyError, setPasskeyError] = useState("")

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

  async function finalizeSignup(passkey?: {
    credentialId: string
    publicKey?: string | null
    signCount?: number
    transports?: string[]
    metadata?: unknown
  }) {
    setSubmitting(true)
    setPasskeyError("")

    try {
      const res = await fetch("/api/auth/signup/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, passkey }),
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
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const userIdBytes = toBytesFromString(uid)

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Better Form" },
          user: {
            id: userIdBytes,
            name: email,
            displayName: email,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          timeout: 60000,
          attestation: "none",
          authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
          },
        },
      })) as PublicKeyCredential | null

      if (!credential) {
        setPasskeyError("Passkey setup was cancelled.")
        setSubmitting(false)
        return
      }

      const response = credential.response as AuthenticatorAttestationResponse
      const publicKeyBuffer = response.getPublicKey?.() || null

      const passkeyPayload = {
        credentialId: toBase64Url(new Uint8Array(credential.rawId)),
        publicKey: publicKeyBuffer ? toBase64Url(new Uint8Array(publicKeyBuffer)) : null,
        signCount: 0,
        transports: response.getTransports ? response.getTransports() : [],
        metadata: {
          type: credential.type,
          clientDataJSON: toBase64Url(new Uint8Array(response.clientDataJSON)),
        },
      }

      await finalizeSignup(passkeyPayload)
    } catch {
      setPasskeyError("Passkey setup failed. You can try again or skip.")
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
              ? "You can now set up a passkey, or skip and continue to your dashboard."
              : `We sent a verification link to ${email}. Open it and choose “Yes, this was me”.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pollError ? <p className="text-destructive text-sm">{pollError}</p> : null}

          {verified ? (
            <>
              <Button onClick={setupPasskey} disabled={submitting}>
                {submitting ? "Processing..." : "Set up passkey"}
              </Button>
              <Button type="button" variant="outline" onClick={() => finalizeSignup()} disabled={submitting}>
                Continue without passkey
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => router.push("/signup")}>Back</Button>
          )}

          {passkeyError ? <p className="text-destructive text-sm">{passkeyError}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
