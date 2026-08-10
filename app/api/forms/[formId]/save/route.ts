import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import type { Prisma } from '@/lib/generated/prisma'
import { parseFormSchema, ensureContractEmailField, releaseContractLockIfUnused } from '@/lib/form-schema'

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
    } catch {
      console.log('Save form payload received (unserializable)')
    }
    const schema = body.schema
    const name = body.name

    const existingSchema = parseFormSchema(form.schema)
    const incomingFields = Array.isArray(schema?.fields) ? schema.fields : existingSchema.fields

    // A required, verified email field can't be removed while a signature field or a
    // payment requirement still depends on it — re-insert/lock it if the client tries to
    // drop it, mirroring the same guard in the payment-settings route.
    const needsLockedEmail = form.paymentRequired || incomingFields.some((f: { type: string }) => f.type === 'signature')
    const guardedFields = needsLockedEmail
      ? ensureContractEmailField(incomingFields)
      : releaseContractLockIfUnused(incomingFields)

    const nextSchema = {
      ...existingSchema,
      ...(typeof schema === 'object' && schema !== null ? schema : {}),
      fields: guardedFields,
    }

    const data: { schema: Prisma.InputJsonValue; name?: string } = { schema: nextSchema as Prisma.InputJsonValue }
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
