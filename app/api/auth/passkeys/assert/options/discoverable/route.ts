import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function getRpId(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  try {
    const challenge = crypto.randomBytes(32)
    const challengeBase64Url = toBase64Url(challenge)
    const challengeId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5)

    const { default: prisma } = await import("@/lib/db")
    await prisma.webAuthnChallenge.create({
      data: {
        id: challengeId,
        challenge: challengeBase64Url,
        type: "assertion",
        expiresAt,
      },
    })

    return NextResponse.json({
      challengeId,
      challenge: challengeBase64Url,
      timeout: 60000,
      rpId: getRpId(request),
      userVerification: "preferred",
    })
  } catch (error) {
    console.error("Passkey assertion options error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
