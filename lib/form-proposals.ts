import type { Prisma } from '@/lib/generated/prisma'
import {
  ensureContractEmailField,
  parseFormSchema,
  releaseContractLockIfUnused,
  type FormField,
} from '@/lib/form-schema'
import { AGENT_THEMES, parseAgentFormInput, type ValidationIssue } from '@/lib/agent-forms'

// AI-proposed changes to a form someone already owns. An AI can't change a claimed form directly:
// it submits a complete revised definition, which is stored as a pending proposal, and the owner
// applies or dismisses it from a banner in the editor.
//
// Responses, prefilled links and limited views all point at field and option ids, so a proposal
// keeps the existing ids wherever a field is recognisably the same one (see reconcileWithCurrent).

export type ProposalSource = 'agent' | 'link'

export type ProposalDefinition = {
  name: string
  theme: string
  successMessage?: string
  fields: FormField[]
}

type CurrentForm = {
  id: string
  name: string | null
  theme: string
  successMessage: string
  schema: unknown
  paymentRequired: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeLabel(label: unknown) {
  return String(label ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// ---------------------------------------------------------------------------
// Keeping ids stable
// ---------------------------------------------------------------------------

/**
 * Before validation: a proposed field without an id that has the same type and label as an
 * existing field is treated as that field and gets its id. Fields that send an existing id keep it.
 */
function assignExistingIds(current: FormField[], rawFields: unknown[]): unknown[] {
  const claimed = new Set(
    rawFields.filter(isRecord).map((field) => field.id).filter((id): id is string => typeof id === 'string')
  )

  return rawFields.map((raw) => {
    if (!isRecord(raw) || raw.id !== undefined) return raw
    const match = current.find(
      (field) =>
        !claimed.has(field.id) &&
        field.type === raw.type &&
        normalizeLabel(field.label) === normalizeLabel(raw.label) &&
        normalizeLabel(field.label) !== ''
    )
    if (!match) return raw
    claimed.add(match.id)
    return { ...raw, id: match.id }
  })
}

/**
 * After validation: an existing field keeps every setting the proposal didn't mention (quiz
 * answers, verified-email requirements, file limits, …), and its options keep their ids when the
 * label is unchanged, so earlier answers still display.
 */
function mergeWithExisting(current: FormField[], rawFields: unknown[], parsedFields: FormField[]): FormField[] {
  const rawById = new Map(
    rawFields.filter(isRecord).filter((field) => typeof field.id === 'string').map((field) => [field.id as string, field])
  )

  return parsedFields.map((parsed) => {
    const existing = current.find((field) => field.id === parsed.id)
    const raw = rawById.get(parsed.id)
    if (!existing || !raw || existing.type !== parsed.type) return parsed

    const merged: FormField = { ...existing, type: parsed.type, label: parsed.label }
    for (const [key, value] of Object.entries(parsed)) {
      if (key in raw) (merged as Record<string, unknown>)[key] = value
    }

    if (parsed.options && 'options' in raw) {
      const existingByLabel = new Map((existing.options ?? []).map((option) => [normalizeLabel(option.label), option.id]))
      merged.options = parsed.options.map((option) => ({
        ...option,
        id: existingByLabel.get(normalizeLabel(option.label)) ?? option.id,
      }))
    }
    return merged
  })
}

export function reconcileWithCurrent(
  form: CurrentForm,
  body: unknown
): { ok: true; definition: ProposalDefinition } | { ok: false; errors: ValidationIssue[] } {
  const current = parseFormSchema(form.schema).fields
  const rawFields = isRecord(body) && Array.isArray(body.fields) ? assignExistingIds(current, body.fields) : undefined
  const input = isRecord(body) ? { ...body, ...(rawFields ? { fields: rawFields } : {}) } : body

  const parsed = parseAgentFormInput(input)
  if (!parsed.ok) return { ok: false, errors: parsed.errors }

  const { name, theme, successMessage, fields } = parsed.value
  return {
    ok: true,
    definition: {
      name,
      theme,
      ...(successMessage ? { successMessage } : {}),
      fields: mergeWithExisting(current, rawFields ?? [], fields),
    },
  }
}

// ---------------------------------------------------------------------------
// Create, summarize, apply
// ---------------------------------------------------------------------------

export async function createProposal(form: CurrentForm, body: unknown, source: ProposalSource) {
  const reconciled = reconcileWithCurrent(form, body)
  if (!reconciled.ok) return reconciled

  const { default: prisma } = await import('@/lib/db')
  const proposal = await prisma.$transaction(async (tx) => {
    await tx.formEditProposal.updateMany({
      where: { formId: form.id, status: 'pending' },
      data: { status: 'superseded', resolvedAt: new Date() },
    })
    return tx.formEditProposal.create({
      data: { formId: form.id, source, definition: reconciled.definition as unknown as Prisma.InputJsonValue },
    })
  })
  return { ok: true as const, proposal }
}

export function proposalDefinition(definition: unknown): ProposalDefinition {
  const raw = isRecord(definition) ? definition : {}
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    theme: typeof raw.theme === 'string' && (AGENT_THEMES as readonly string[]).includes(raw.theme) ? raw.theme : 'blue',
    successMessage: typeof raw.successMessage === 'string' ? raw.successMessage : undefined,
    fields: Array.isArray(raw.fields) ? (raw.fields as FormField[]) : [],
  }
}

export type ProposalSummary = {
  name?: { from: string; to: string }
  theme?: { from: string; to: string }
  successMessageChanged: boolean
  added: string[]
  removed: string[]
  changed: Array<{ label: string; changes: string[] }>
  reordered: boolean
  hasChanges: boolean
}

function fieldLabel(field: FormField) {
  return field.label?.trim() || (field.type === 'section' ? 'Page break' : 'Untitled text block')
}

export function summarizeProposal(form: CurrentForm, definition: ProposalDefinition): ProposalSummary {
  const current = parseFormSchema(form.schema).fields
  const currentById = new Map(current.map((field) => [field.id, field]))
  const proposedIds = new Set(definition.fields.map((field) => field.id))

  const added: string[] = []
  const changed: ProposalSummary['changed'] = []
  for (const field of definition.fields) {
    const before = currentById.get(field.id)
    if (!before) {
      added.push(fieldLabel(field))
      continue
    }
    const changes: string[] = []
    if (before.type !== field.type) changes.push('type')
    if ((before.label ?? '') !== (field.label ?? '')) changes.push(`renamed from "${fieldLabel(before)}"`)
    if ((before.description ?? '') !== (field.description ?? '')) changes.push('description')
    if (!!before.required !== !!field.required) changes.push(field.required ? 'now required' : 'now optional')
    const optionLabels = (f: FormField) => (f.options ?? []).map((option) => option.label).join('\u0000')
    if (optionLabels(before) !== optionLabels(field)) changes.push('options')
    if ((before.content ?? '') !== (field.content ?? '')) changes.push('contract text')
    if (changes.length > 0) changed.push({ label: fieldLabel(field), changes })
  }

  const removed = current.filter((field) => !proposedIds.has(field.id)).map(fieldLabel)
  const keptOrder = (ids: string[]) => ids.filter((id) => currentById.has(id) && proposedIds.has(id))
  const reordered =
    keptOrder(current.map((f) => f.id)).join() !== keptOrder(definition.fields.map((f) => f.id)).join()

  const summary: ProposalSummary = {
    successMessageChanged: !!definition.successMessage && definition.successMessage !== form.successMessage,
    added,
    removed,
    changed,
    reordered,
    hasChanges: false,
  }
  if ((form.name ?? '') !== definition.name) summary.name = { from: form.name ?? '', to: definition.name }
  if (form.theme !== definition.theme) summary.theme = { from: form.theme, to: definition.theme }
  summary.hasChanges =
    !!summary.name || !!summary.theme || summary.successMessageChanged || added.length > 0 ||
    removed.length > 0 || changed.length > 0 || reordered
  return summary
}

/**
 * Owner-only. Applies or dismisses a pending proposal. Applying replaces the form's name, theme,
 * success message and questions; everything else in the schema (limited views, …) is kept.
 */
export async function resolveProposal(
  ownerId: string,
  formId: string,
  proposalId: string,
  action: 'apply' | 'dismiss'
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { default: prisma } = await import('@/lib/db')

  return prisma.$transaction(async (tx) => {
    const proposal = await tx.formEditProposal.findUnique({ where: { id: proposalId }, include: { form: true } })
    if (!proposal || proposal.formId !== formId || proposal.form.accountId !== ownerId) {
      return { ok: false, status: 404, error: 'not_found' }
    }
    if (proposal.status !== 'pending') return { ok: false, status: 409, error: 'already_resolved' }

    if (action === 'apply') {
      const { form } = proposal
      const definition = proposalDefinition(proposal.definition)
      const needsLockedEmail = form.paymentRequired || definition.fields.some((field) => field.type === 'signature')
      const fields = needsLockedEmail ? ensureContractEmailField(definition.fields) : releaseContractLockIfUnused(definition.fields)
      const existingSchema = isRecord(form.schema) ? form.schema : {}

      await tx.form.update({
        where: { id: form.id },
        data: {
          name: definition.name,
          theme: definition.theme,
          ...(definition.successMessage ? { successMessage: definition.successMessage } : {}),
          schema: { ...existingSchema, fields } as unknown as Prisma.InputJsonValue,
        },
      })
    }

    await tx.formEditProposal.update({
      where: { id: proposal.id },
      data: { status: action === 'apply' ? 'applied' : 'dismissed', resolvedAt: new Date() },
    })
    return { ok: true }
  })
}
