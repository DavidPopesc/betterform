import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'

export async function POST(
  req: Request,
  { params }: { params: { formId?: string } | Promise<{ formId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const resolvedParams = (await params) as { formId?: string }
    const formId = resolvedParams?.formId
    if (!formId) return NextResponse.json({ error: 'invalid_form_id' }, { status: 400 })

    // Verify the form belongs to the user
    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({ where: { id: formId } })
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    // Debug: log incoming payload to help diagnose truncated `name`
    try {
      // avoid logging huge blobs; stringify safely
      const preview = JSON.stringify(body).slice(0, 2000)
      console.log('Save form payload received:', preview)
    } catch (err) {
      console.log('Save form payload received (unserializable)')
    }
    const schema = body.schema
    const name = body.name

    const data: any = { schema }
    if (typeof name === 'string') data.name = name

    const updated = await prisma.form.update({
      where: { id: formId },
      data,
    })

    return NextResponse.json({ success: true, form: updated })
  } catch (err) {
    console.error('Save form error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
