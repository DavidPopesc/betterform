import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const resolvedParams = (await params) as { formId?: string }
    const formId = resolvedParams?.formId
    if (!formId) return NextResponse.json({ error: 'invalid_form_id' }, { status: 400 })

    const { default: prisma } = await import('@/lib/db')
    
    // Verify form ownership
    const form = await prisma.form.findUnique({ 
      where: { id: formId },
      select: { accountId: true }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Fetch all responses for this form
    const responses = await prisma.response.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        response: true,
        createdAt: true,
        respondentIp: true,
        submissionLocation: true,
        respondentUserAgent: true,
        deviceMetadata: true,
        signedAt: true,
        locked: true,
        contractSnapshot: true,
      },
    })

    return NextResponse.json({ responses })
  } catch (err) {
    console.error('Fetch responses error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
