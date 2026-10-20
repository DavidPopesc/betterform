import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth-server'
import { getClientIp } from '@/lib/form-account'
import {
  claimFormsForAccount,
  createAgentForm,
  readPendingClaimTokens,
  setPendingClaimTokens,
} from '@/lib/agent-forms'

// "Add to my account" on a /new#… link. The form only gets stored now, from the user's own
// browser. It goes through the normal agent create + claim path: logged-in users claim it
// immediately, everyone else gets the claim token parked in the cookie that /dashboard
// finishes after signup or login.
export async function POST(req: Request) {
  let body: { definition?: unknown; then?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const result = await createAgentForm(body.definition, getClientIp(req.headers))
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message, issues: result.issues },
      { status: result.status }
    )
  }

  const user = await getSessionUser()
  if (user) {
    const [formId] = await claimFormsForAccount(user.id, [result.claimToken])
    return NextResponse.json({ redirect: `/forms/${formId}/edit` })
  }

  const res = NextResponse.json({ redirect: body.then === 'login' ? '/login' : '/signup' })
  setPendingClaimTokens(res, [...readPendingClaimTokens(await cookies()), result.claimToken])
  return res
}
