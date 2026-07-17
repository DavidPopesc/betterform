import type { NextRequest } from "next/server"

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
