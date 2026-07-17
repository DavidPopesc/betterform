"use client"

import { useEffect, useState } from "react"
import { KeyRound, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import LocalizedDateTime from "@/components/LocalizedDateTime"

type Passkey = {
  id: string
  name: string | null
  credentialId: string
  transports: string[]
  createdAt: string
}

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

export default function PasskeysSettings({ initialPasskeys }: { initialPasskeys: Passkey[] }) {
  const [passkeys, setPasskeys] = useState<Passkey[]>(initialPasskeys)
  const [newPasskeyName, setNewPasskeyName] = useState("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  // Starts false to match the server-rendered markup, then flips after mount
  // — checking navigator during render would differ between server and
  // client and trigger a hydration mismatch.
  const [passkeysSupported, setPasskeysSupported] = useState(false)

  useEffect(() => {
    setPasskeysSupported("credentials" in navigator && typeof window.PublicKeyCredential !== "undefined")
  }, [])

  async function addPasskey() {
    setError("")

    if (!passkeysSupported) {
      setError("Passkeys are not available in this browser.")
      return
    }

    setAdding(true)

    try {
      const optionsRes = await fetch("/api/account/passkeys/register/options", { method: "POST" })
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}))
        setError(data?.error || "Could not start passkey setup.")
        setAdding(false)
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
        setError("Passkey setup was cancelled.")
        setAdding(false)
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

      const verifyRes = await fetch("/api/account/passkeys/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, credential: credentialJSON, name: newPasskeyName }),
      })

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}))
        setError(data?.error || "Passkey setup failed. Please try again.")
        setAdding(false)
        return
      }

      const { passkey } = await verifyRes.json()
      setPasskeys((current) => [passkey, ...current])
      setNewPasskeyName("")
    } catch {
      setError("Passkey setup failed. Please try again.")
    } finally {
      setAdding(false)
    }
  }

  async function deletePasskey(id: string) {
    if (!window.confirm("Remove this passkey? You'll no longer be able to sign in with it.")) {
      return
    }

    setError("")
    setDeletingId(id)

    try {
      const res = await fetch(`/api/account/passkeys/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Could not remove passkey.")
        return
      }

      setPasskeys((current) => current.filter((p) => p.id !== id))
    } catch {
      setError("Could not remove passkey.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Sign in without a password using a passkey stored on your device, browser, or password manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">You don&apos;t have any passkeys yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{passkey.name || "Passkey"}</div>
                    <div className="text-xs text-muted-foreground">
                      Added <LocalizedDateTime value={passkey.createdAt} />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove passkey"
                  disabled={deletingId === passkey.id}
                  onClick={() => deletePasskey(passkey.id)}
                >
                  {deletingId === passkey.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            placeholder="Name this passkey (optional)"
            value={newPasskeyName}
            onChange={(e) => setNewPasskeyName(e.target.value)}
            disabled={adding}
            maxLength={60}
          />
          <Button type="button" onClick={addPasskey} disabled={adding || !passkeysSupported} className="shrink-0">
            {adding ? "Adding..." : "Add passkey"}
          </Button>
        </div>

        {!passkeysSupported ? (
          <p className="text-xs text-muted-foreground">Passkeys aren&apos;t supported in this browser.</p>
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
