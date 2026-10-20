import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth-server'
import { claimFormsForAccount, readPendingClaimTokens, setPendingClaimTokens } from '@/lib/agent-forms'

// Posted from the claim page. Logged-in users claim immediately; everyone else gets the
// token parked in a cookie and is sent to sign up / log in. Every auth flow ends on
// /dashboard, which finishes the claim via /api/claim/complete.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const origin = new URL(req.url).origin

  if (!/^bf_claim_[A-Za-z0-9_-]+$/.test(token)) {
    return NextResponse.redirect(`${origin}/claim/${encodeURIComponent(token)}`, 303)
  }

  const user = await getSessionUser()
  if (user) {
    const [formId] = await claimFormsForAccount(user.id, [token])
    const destination = formId ? `/forms/${formId}/edit` : `/claim/${token}`
    return NextResponse.redirect(`${origin}${destination}`, 303)
  }

  const formData = await req.formData().catch(() => null)
  const then = formData?.get('then') === 'login' ? '/login' : '/signup'

  const res = NextResponse.redirect(`${origin}${then}`, 303)
  const cookieStore = await cookies()
  setPendingClaimTokens(res, [...readPendingClaimTokens(cookieStore), token])
  return res
}
