import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'

export async function DELETE(
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
    
    if (!form) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    
    if (form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Delete form (cascade deletes also remove responses via onDelete: Cascade in schema)
    await prisma.form.delete({ where: { id: formId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete form error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
