import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { createProposal } from '@/lib/form-proposals'

// The owner opened an AI-written /edit/{publicId}#… link: store it as a pending proposal so they
// can review it in the editor. Nothing about the form changes until they apply it there.
export async function POST(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { formId } = await params
    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({ where: { id: formId } })
    if (!form || form.accountId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const result = await createProposal(form, body, 'link')
    if (!result.ok) return NextResponse.json({ error: 'validation_failed', issues: result.errors }, { status: 422 })
    return NextResponse.json({ proposalId: result.proposal.id, redirect: `/forms/${form.id}/edit` })
  } catch (err) {
    console.error('Create proposal error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
