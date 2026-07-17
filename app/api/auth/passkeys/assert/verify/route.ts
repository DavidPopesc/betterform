import { NextRequest, NextResponse } from "next/server"
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server"
import { createSession, setSessionCookie } from "@/lib/session"
import { getRpId, getExpectedOrigin } from "@/lib/webauthn"

export async function POST(request: NextRequest) {
  try {
    const {
      challengeId,
      credential,
    }: { challengeId?: string; credential?: AuthenticationResponseJSON } = await request.json()

    if (!challengeId || !credential) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const { default: prisma } = await import("@/lib/db")

    const challengeRow = await prisma.webAuthnChallenge.findUnique({ where: { id: challengeId } })
    if (!challengeRow || challengeRow.type !== "assertion") {
      return NextResponse.json({ error: "Invalid challenge" }, { status: 400 })
    }

    if (challengeRow.expiresAt < new Date()) {
      await prisma.webAuthnChallenge.delete({ where: { id: challengeId } }).catch(() => {})
      return NextResponse.json({ error: "Challenge expired" }, { status: 400 })
    }

    const passkey = await prisma.passkeyCredential.findUnique({ where: { credentialId: credential.id } })
    if (!passkey) {
      return NextResponse.json({ error: "Passkey not recognized" }, { status: 401 })
    }

    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: getExpectedOrigin(request),
        expectedRPID: getRpId(request),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
          counter: passkey.signCount,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
      })
    } catch (err) {
      console.error("Passkey assertion verification error:", err)
      return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }

    if (!verification.verified) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }

    // Clone-authenticator replay protection: the reported counter must have advanced.
    if (verification.authenticationInfo.newCounter !== 0 && verification.authenticationInfo.newCounter <= passkey.signCount) {
      console.error("Passkey counter did not advance, possible cloned authenticator:", passkey.credentialId)
      return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }

    await prisma.passkeyCredential.update({
      where: { id: passkey.id },
      data: { signCount: verification.authenticationInfo.newCounter },
    })

    const { token, expiresAt } = await createSession(passkey.userId)

    await prisma.webAuthnChallenge.delete({ where: { id: challengeId } }).catch(() => {})

    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, token, expiresAt)
    return res
  } catch (error) {
    console.error("Passkey assertion verify error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
