import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const FORM_ACCOUNT_COOKIE = 'form_account_uuid'
const COOKIE_MAX_AGE = 365 * 2 * 24 * 60 * 60 // 2 years

/**
 * Get the current form account UUID from cookies without modifying them.
 */
export async function getFormAccountId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(FORM_ACCOUNT_COOKIE)?.value ?? null
}

async function ensureFormAccountRecord(formAccountId: string) {
  const { default: prisma } = await import('@/lib/db')
  // Upsert rather than a bare create: a cookie can outlive its DB row (a dev DB
  // reset, a manual data-retention delete, testing against a different DATABASE_URL
  // at some point, etc). Without this, every downstream lookup silently no-ops —
  // verification emails "succeed" but never actually register as verified.
  await prisma.formAccountUUID.upsert({
    where: { id: formAccountId },
    create: {
      id: formAccountId,
      ipAddresses: [],
      verifiedEmails: [],
      verifiedPhones: [],
      formsViewed: [],
      formsSubmitted: [],
    },
    update: {},
  })
}

/**
 * Get or create a form account UUID from cookies.
 */
export async function getOrCreateFormAccountId(): Promise<string> {
  const cookieStore = await cookies()
  let formAccountId = cookieStore.get(FORM_ACCOUNT_COOKIE)?.value

  if (!formAccountId) {
    formAccountId = uuidv4()
    cookieStore.set(FORM_ACCOUNT_COOKIE, formAccountId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  // Always ensure the row exists, whether the cookie was just minted or already present.
  await ensureFormAccountRecord(formAccountId)

  return formAccountId
}

export function clearFormAccountCookie(response: NextResponse) {
  response.cookies.set({
    name: FORM_ACCOUNT_COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
}

export async function deleteFormAccountRecord(formAccountId: string) {
  const { default: prisma } = await import('@/lib/db')
  await prisma.formAccountUUID.deleteMany({
    where: { id: formAccountId },
  })
}

/**
 * Get device metrics from request headers
 */
export function getDeviceMetrics(headers: Headers): Record<string, unknown> {
  return {
    userAgent: headers.get('user-agent') || undefined,
    language: headers.get('accept-language') || undefined,
    platform: headers.get('sec-ch-ua-platform') || undefined,
    mobile: headers.get('sec-ch-ua-mobile') || undefined,
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Update form account tracking data
 */
export async function updateFormAccountTracking(
  formAccountId: string,
  data: {
    ip?: string
    deviceMetrics?: Record<string, unknown>
    formViewed?: string
    formSubmitted?: string
  }
) {
  const { default: prisma } = await import('@/lib/db')
  
  const account = await prisma.formAccountUUID.findUnique({
    where: { id: formAccountId },
  })

  if (!account) return

  const updates: {
    ipAddresses?: unknown
    deviceMetrics?: Record<string, unknown>
    formsViewed?: unknown
    formsSubmitted?: unknown
    lastSeen?: Date
  } = {
    lastSeen: new Date(),
  }

  // Add IP if provided and not already tracked
  if (data.ip) {
    const ips = (account.ipAddresses as string[]) || []
    if (!ips.includes(data.ip)) {
      updates.ipAddresses = [...ips, data.ip] as unknown
    }
  }

  // Update device metrics
  if (data.deviceMetrics) {
    updates.deviceMetrics = data.deviceMetrics
  }

  // Track form view
  if (data.formViewed) {
    const viewed = (account.formsViewed as Array<{ formId: string; viewedAt: string }>) || []
    updates.formsViewed = [
      ...viewed,
      { formId: data.formViewed, viewedAt: new Date().toISOString() },
    ] as unknown
  }

  // Track form submission
  if (data.formSubmitted) {
    const submitted = (account.formsSubmitted as Array<{ formId: string; submittedAt: string }>) || []
    updates.formsSubmitted = [
      ...submitted,
      { formId: data.formSubmitted, submittedAt: new Date().toISOString() },
    ] as unknown
  }

  await prisma.formAccountUUID.update({
    where: { id: formAccountId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: updates as any, // Type assertion needed for Json field updates
  })
}

/**
 * Add verified email to form account
 */
export async function addVerifiedEmail(formAccountId: string, email: string) {
  const { default: prisma } = await import('@/lib/db')

  // This is reached from the verify-link click, which carries `formAccountId` from the
  // emailed URL rather than the current request's cookie — it never goes through
  // `getOrCreateFormAccountId`'s row-repair, so it needs its own fallback here. Without
  // this, a missing row means the click reports success but silently verifies nothing.
  const account = await prisma.formAccountUUID.upsert({
    where: { id: formAccountId },
    create: {
      id: formAccountId,
      ipAddresses: [],
      verifiedEmails: [],
      verifiedPhones: [],
      formsViewed: [],
      formsSubmitted: [],
    },
    update: {},
  })

  const emails = account.verifiedEmails || []
  if (!emails.includes(email)) {
    await prisma.formAccountUUID.update({
      where: { id: formAccountId },
      data: {
        verifiedEmails: [...emails, email],
      },
    })
  }
}

/**
 * Remove a verified email from a form account
 */
export async function removeVerifiedEmail(formAccountId: string, email: string) {
  const { default: prisma } = await import('@/lib/db')

  const account = await prisma.formAccountUUID.findUnique({
    where: { id: formAccountId },
  })

  if (!account) return

  const emails = account.verifiedEmails || []
  const normalized = email.toLowerCase().trim()
  const next = emails.filter((existing) => existing.toLowerCase().trim() !== normalized)

  if (next.length !== emails.length) {
    await prisma.formAccountUUID.update({
      where: { id: formAccountId },
      data: { verifiedEmails: next },
    })
  }
}

/**
 * Get verified emails for form account
 */
export async function getVerifiedEmails(formAccountId: string): Promise<string[]> {
  const { default: prisma } = await import('@/lib/db')
  
  const account = await prisma.formAccountUUID.findUnique({
    where: { id: formAccountId },
    select: { verifiedEmails: true },
  })

  return account?.verifiedEmails || []
}

/**
 * Check if form account has already submitted a form
 */
export async function hasFormAccountSubmitted(
  formAccountId: string,
  formId: string
): Promise<boolean> {
  const { default: prisma } = await import('@/lib/db')
  
  const response = await prisma.response.findFirst({
    where: {
      formId,
      formAccountId,
    },
  })

  return !!response
}

/**
 * Check if email has already submitted a form
 */
export async function hasEmailSubmitted(
  email: string,
  formId: string
): Promise<boolean> {
  const { default: prisma } = await import('@/lib/db')
  
  const response = await prisma.response.findFirst({
    where: {
      formId,
      respondentEmail: email,
    },
  })

  return !!response
}
