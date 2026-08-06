import type { NextRequest } from "next/server"
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server"

export const RP_NAME = "Better Form"

export function getRpId(request: NextRequest) {
  const appUrl = process.env.APP_URL
  if (appUrl) {
    try {
      return new URL(appUrl).hostname
    } catch {
      return request.nextUrl.hostname
    }
  }
  return request.nextUrl.hostname
}

export function getExpectedOrigin(request: NextRequest) {
  const appUrl = process.env.APP_URL
  if (appUrl) {
    try {
      return new URL(appUrl).origin
    } catch {
      return request.nextUrl.origin
    }
  }
  return request.nextUrl.origin
}

// Shared WebAuthn registration-ceremony mechanics used by both the signup
// flow (app/api/auth/passkeys/register/*) and the authenticated account
// settings flow (app/api/account/passkeys/register/*). Each caller is
// responsible for its own authorization check before calling these.

export async function createRegistrationChallenge(params: {
  request: NextRequest
  userId: string
  userEmail: string
  excludeCredentials?: { id: string; transports?: string[] }[]
}) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(params.request),
    userName: params.userEmail,
    userDisplayName: params.userEmail,
    attestationType: "none",
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    excludeCredentials: params.excludeCredentials as Parameters<
      typeof generateRegistrationOptions
    >[0]["excludeCredentials"],
  })

  const { default: prisma } = await import("@/lib/db")
  const challengeRow = await prisma.webAuthnChallenge.create({
    data: {
      userId: params.userId,
      challenge: options.challenge,
      type: "registration",
      expiresAt: new Date(Date.now() + 1000 * 60 * 5),
    },
  })

  return { challengeId: challengeRow.id, options }
}

type VerifyRegistrationChallengeResult =
  | { ok: true; registrationInfo: NonNullable<VerifiedRegistrationResponse["registrationInfo"]> }
  | { ok: false; error: string }

export async function verifyRegistrationChallenge(params: {
  request: NextRequest
  userId: string
  challengeId: string
  credential: RegistrationResponseJSON
}): Promise<VerifyRegistrationChallengeResult> {
  const { default: prisma } = await import("@/lib/db")

  const challengeRow = await prisma.webAuthnChallenge.findUnique({ where: { id: params.challengeId } })
  if (!challengeRow || challengeRow.type !== "registration" || challengeRow.userId !== params.userId) {
    return { ok: false, error: "Invalid challenge" }
  }

  if (challengeRow.expiresAt < new Date()) {
    await prisma.webAuthnChallenge.delete({ where: { id: params.challengeId } }).catch(() => {})
    return { ok: false, error: "Challenge expired" }
  }

  let verification: VerifiedRegistrationResponse
  try {
    verification = await verifyRegistrationResponse({
      response: params.credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: getExpectedOrigin(params.request),
      expectedRPID: getRpId(params.request),
    })
  } catch (err) {
    console.error("Passkey registration verification error:", err)
    return { ok: false, error: "Verification failed" }
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "Verification failed" }
  }

  await prisma.webAuthnChallenge.delete({ where: { id: params.challengeId } }).catch(() => {})

  return { ok: true, registrationInfo: verification.registrationInfo }
}
