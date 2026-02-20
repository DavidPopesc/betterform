import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

const FORM_ACCOUNT_COOKIE = 'form_account_uuid'
const COOKIE_MAX_AGE = 365 * 2 * 24 * 60 * 60 // 2 years

/**
 * Get or create a form account UUID from cookies
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

    // Create the account record in the database
    const { default: prisma } = await import('@/lib/db')
    await prisma.formAccountUUID.create({
      data: {
        id: formAccountId,
        ipAddresses: [],
        verifiedEmails: [],
        verifiedPhones: [],
        formsViewed: [],
        formsSubmitted: [],
      },
    })
  }

  return formAccountId
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
  
  const account = await prisma.formAccountUUID.findUnique({
    where: { id: formAccountId },
  })

  if (!account) return

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
