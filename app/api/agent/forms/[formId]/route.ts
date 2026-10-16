import { NextResponse } from 'next/server'
import type { Prisma } from '@/lib/generated/prisma'
import { getBearerToken, hashToken, parseAgentFormInput, serializeAgentForm } from '@/lib/agent-forms'

async function findEditableForm(req: Request, params: Promise<{ formId?: string }>) {
  const { formId } = await params
  const token = getBearerToken(req)
  if (!formId || !token) return null

  const { default: prisma } = await import('@/lib/db')
  // editTokenHash is cleared on claim, so a claimed form never matches here.
  const form = await prisma.form.findUnique({ where: { editTokenHash: hashToken(token) } })
  if (!form || form.id !== formId || form.accountId !== null) return null
  if (form.claimExpiresAt && form.claimExpiresAt < new Date()) return null
  return form
}

const notFound = () =>
  NextResponse.json(
    {
      error: 'not_found',
      message: 'No editable form matches this id and editToken. It may have been claimed (only the owner can edit it now) or expired.',
    },
    { status: 404 }
  )

export async function GET(req: Request, { params }: { params: Promise<{ formId?: string }> }) {
  try {
    const form = await findEditableForm(req, params)
    if (!form) return notFound()
    return NextResponse.json(serializeAgentForm(form))
  } catch (err) {
    console.error('Agent form get error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// Full replacement: send the complete form definition, same shape as the create call.
export async function PATCH(req: Request, { params }: { params: Promise<{ formId?: string }> }) {
  try {
    const form = await findEditableForm(req, params)
    if (!form) return notFound()

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const parsed = parseAgentFormInput(body)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: 'validation_failed', issues: parsed.errors, docs: 'https://betterform.dev/llms.txt' },
        { status: 422 }
      )
    }

    const { name, theme, successMessage, fields } = parsed.value
    const { default: prisma } = await import('@/lib/db')
    const updated = await prisma.form.update({
      where: { id: form.id },
      data: {
        name,
        theme,
        ...(successMessage ? { successMessage } : {}),
        schema: { fields } as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json(serializeAgentForm(updated))
  } catch (err) {
    console.error('Agent form update error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
