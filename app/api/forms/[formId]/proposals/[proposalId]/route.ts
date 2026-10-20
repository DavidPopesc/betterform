import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { resolveProposal } from '@/lib/form-proposals'

// The owner's answer from the editor banner: apply the AI's changes or keep the current form.
export async function POST(req: Request, { params }: { params: Promise<{ formId: string; proposalId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { formId, proposalId } = await params
    const body = await req.json().catch(() => ({}))
    const action = body?.action
    if (action !== 'apply' && action !== 'dismiss') {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
    }

    const result = await resolveProposal(user.id, formId, proposalId, action)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resolve proposal error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
