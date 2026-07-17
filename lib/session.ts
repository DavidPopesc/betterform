import crypto from "crypto"
import { NextResponse } from "next/server"

const SESSION_COOKIE_NAME = "bf_session"
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 365 * 2

type SessionPayload = {
  sid: string
  uid: string
  exp: number
}

function getSessionSecret() {
  const secret = process.env.SESSION_JWT_SECRET || process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('SESSION_JWT_SECRET or AUTH_SECRET environment variable must be set')
  }
  return secret
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(normalized + padding, "base64")
}

function signJwt(payload: SessionPayload) {
  const header = { alg: "HS256", typ: "JWT" }
  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(data).digest("base64url")
  return `${data}.${signature}`
}

function verifyJwt(token: string): SessionPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, signature] = parts
  const data = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = crypto.createHmac("sha256", getSessionSecret()).update(data).digest("base64url")
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as SessionPayload
    if (!payload.sid || !payload.uid || !payload.exp) return null
    if (payload.exp * 1000 <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export function parseSessionCookie(token: string) {
  const jwt = verifyJwt(token)
  if (jwt) {
    return { type: "jwt" as const, payload: jwt, tokenHash: sha256Hex(token) }
  }

  return { type: "legacy" as const, tokenHash: sha256Hex(token) }
}

export async function createSession(userId: string) {
  const { default: prisma } = await import("@/lib/db")
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_SECONDS * 1000)
  const token = signJwt({
    sid: sessionId,
    uid: userId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  })

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      tokenHash: sha256Hex(token),
      expiresAt,
    },
  })

  return { token, expiresAt }
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    maxAge: SESSION_LIFETIME_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })
}

export { SESSION_COOKIE_NAME }
