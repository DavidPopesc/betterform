import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'

export async function POST(
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
      select: { 
        accountId: true,
        name: true,
        schema: true,
        theme: true,
        isQuiz: true,
        showScore: true,
        responsesEnabled: true,
        responseDeadline: true,
        oneResponsePerEmail: true,
        notifyOnFormSubmission: true,
      }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Create duplicate form
    const newForm = await prisma.form.create({
      data: {
        accountId: user.id,
        name: `${form.name} (copy)`,
        schema: form.schema ?? {},
        theme: form.theme,
        isQuiz: form.isQuiz,
        showScore: form.showScore,
        responsesEnabled: form.responsesEnabled,
        responseDeadline: form.responseDeadline || undefined,
        oneResponsePerEmail: form.oneResponsePerEmail,
        notifyOnFormSubmission: form.notifyOnFormSubmission,
      },
    })

    return NextResponse.json({ id: newForm.id })
  } catch (err) {
    console.error('Duplicate form error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
