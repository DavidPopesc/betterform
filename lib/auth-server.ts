import { cookies } from 'next/headers'
import crypto from 'crypto'

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Extract and validate the current user's session from cookies.
 * Returns the authenticated user object, or null if not authenticated.
 */
export async function getSessionUser() {
  const cookieStore = (await Promise.resolve(cookies() as any)) as any
  const token = cookieStore.get?.('bf_session')?.value

  if (!token) {
    return null
  }

  const tokenHash = sha256Hex(token)
  const { default: prisma } = await import('@/lib/db')
  const session = await prisma.session.findFirst({
    where: { tokenHash, revoked: false },
    include: { user: true },
  })

  if (!session || (session.expiresAt && session.expiresAt < new Date())) {
    return null
  }

  return session.user
}
