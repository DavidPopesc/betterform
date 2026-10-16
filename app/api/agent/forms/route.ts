import { NextResponse } from 'next/server'
import type { Prisma } from '@/lib/generated/prisma'
import { getClientIp } from '@/lib/form-account'
import {
  AGENT_CREATE_LIMIT_PER_HOUR,
  CLAIM_TTL_DAYS,
  claimUrlFor,
  generateToken,
  hashIp,
  hashToken,
  parseAgentFormInput,
  serializeAgentForm,
} from '@/lib/agent-forms'

// Unauthenticated: lets an LLM agent create a form on a user's behalf.
// Docs for agents live at /llms.txt.
export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'invalid_json', message: 'Request body must be valid JSON. See https://betterform.dev/llms.txt' },
        { status: 400 }
      )
    }

    const parsed = parseAgentFormInput(body)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: 'validation_failed', issues: parsed.errors, docs: 'https://betterform.dev/llms.txt' },
        { status: 422 }
      )
    }

    const { default: prisma } = await import('@/lib/db')

    const creatorIpHash = hashIp(getClientIp(req.headers))
    const recentCount = await prisma.form.count({
      where: { creatorIpHash, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    })
    if (recentCount >= AGENT_CREATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: 'rate_limited', message: `At most ${AGENT_CREATE_LIMIT_PER_HOUR} forms per hour. Update an existing form with its editToken instead.` },
        { status: 429 }
      )
    }

    const claimToken = generateToken('bf_claim')
    const editToken = generateToken('bf_edit')
    const { name, theme, successMessage, fields } = parsed.value

    const form = await prisma.form.create({
      data: {
        accountId: null,
        name,
        theme,
        ...(successMessage ? { successMessage } : {}),
        schema: { fields } as unknown as Prisma.InputJsonValue,
        responsesEnabled: false,
        notifyOnFormSubmission: true,
        createdByAgent: true,
        claimTokenHash: hashToken(claimToken),
        editTokenHash: hashToken(editToken),
        claimExpiresAt: new Date(Date.now() + CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000),
        creatorIpHash,
      },
    })

    return NextResponse.json(
      {
        ...serializeAgentForm(form),
        claimUrl: claimUrlFor(claimToken),
        editToken,
        instructions:
          'Give the user the claimUrl. Opening it shows a preview and lets them add the form to their Better Form account ' +
          '(signing up if needed); the form only accepts responses after that. Keep claimUrl private — anyone with it can claim the form. ' +
          'To revise the form before it is claimed, PATCH /api/agent/forms/{formId} with "Authorization: Bearer {editToken}".',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Agent form create error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
