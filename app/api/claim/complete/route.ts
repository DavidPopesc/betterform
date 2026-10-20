import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth-server'
import { claimFormsForAccount, clearPendingClaimTokens, readPendingClaimTokens } from '@/lib/agent-forms'

// Reached from /dashboard when a pending-claim cookie is present (i.e. right after the
// user signed up or logged in from a claim link). Always clears the cookie so the
// dashboard can't redirect-loop.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const cookieStore = await cookies()
  const claimed = await claimFormsForAccount(user.id, readPendingClaimTokens(cookieStore))

  const destination = claimed.length === 1 ? `/forms/${claimed[0]}/edit` : '/dashboard'
  const res = NextResponse.redirect(`${origin}${destination}`)
  clearPendingClaimTokens(res)
  return res
}

export const dynamic = 'force-dynamic'
