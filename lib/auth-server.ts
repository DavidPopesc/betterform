import { cookies } from 'next/headers'
import { parseSessionCookie } from '@/lib/session'

/**
 * Extract and validate the current user's session from cookies.
 * Returns the authenticated user object, or null if not authenticated.
 */
export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get?.('bf_session')?.value

  if (!token) {
    return null
  }

  const { default: prisma } = await import('@/lib/db')
  const parsed = parseSessionCookie(token)
  const session =
    parsed.type === 'jwt'
      ? await prisma.session.findFirst({
          where: { id: parsed.payload.sid, userId: parsed.payload.uid, revoked: false },
          include: { user: true },
        })
      : await prisma.session.findFirst({
          where: { tokenHash: parsed.tokenHash, revoked: false },
          include: { user: true },
        })

  if (!session || (session.expiresAt && session.expiresAt < new Date())) {
    return null
  }

  return session.user
}
