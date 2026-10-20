import type { FormLink } from '@/lib/generated/prisma'

// Unique form links (/f/{linkId}). Each link has a label the owner sees on responses, optional
// prefilled answers, optional hidden questions, and an optional expiry. Respondents just see the
// form; nothing tells them the link is unique unless a prefilled answer is visible.

export const MAX_LINK_LABEL_LENGTH = 120

export type FormLinkView = {
  id: string
  label: string
  values: Record<string, unknown>
  hiddenFieldIds: string[]
  expiresAt: string | null
  createdAt: string
  expired: boolean
  responseCount?: number
}

export function linkValues(link: Pick<FormLink, 'values'>): Record<string, unknown> {
  const values = link.values
  return typeof values === 'object' && values !== null && !Array.isArray(values) ? (values as Record<string, unknown>) : {}
}

export function linkHiddenFieldIds(link: Pick<FormLink, 'hiddenFieldIds'>): string[] {
  return Array.isArray(link.hiddenFieldIds) ? link.hiddenFieldIds.map(String) : []
}

export function isLinkExpired(link: Pick<FormLink, 'expiresAt'>, now = new Date()) {
  return !!link.expiresAt && link.expiresAt <= now
}

export function serializeFormLink(link: FormLink, responseCount?: number): FormLinkView {
  return {
    id: link.id,
    label: link.label,
    values: linkValues(link),
    hiddenFieldIds: linkHiddenFieldIds(link),
    expiresAt: link.expiresAt?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
    expired: isLinkExpired(link),
    ...(responseCount !== undefined ? { responseCount } : {}),
  }
}

export const EXPIRED_LINK_MESSAGE = 'This link has expired.'

type LinkCheck =
  | { ok: true; link: FormLink | null }
  | { ok: false; status: number; error: string; message: string }

/**
 * Looks up the unique link a submission came through. No id means the plain form link.
 * A link that's missing, belongs to another form, or has expired rejects the submission.
 */
export async function resolveSubmissionLink(formId: string, linkId: unknown): Promise<LinkCheck> {
  if (linkId === undefined || linkId === null || linkId === '') return { ok: true, link: null }
  if (typeof linkId !== 'string') {
    return { ok: false, status: 400, error: 'invalid_link', message: 'This link is not valid.' }
  }

  const { default: prisma } = await import('@/lib/db')
  const link = await prisma.formLink.findUnique({ where: { id: linkId } })
  if (!link || link.formId !== formId) {
    return { ok: false, status: 404, error: 'link_not_found', message: 'This link no longer exists.' }
  }
  if (isLinkExpired(link)) {
    return { ok: false, status: 403, error: 'link_expired', message: EXPIRED_LINK_MESSAGE }
  }
  return { ok: true, link }
}

/**
 * Hidden prefilled answers can't be seen or changed by the respondent, so the server sets them
 * rather than trusting what the browser sent. Visible prefills stay editable.
 */
export function applyLinkToResponses(responses: Record<string, unknown>, link: FormLink | null) {
  if (!link) return responses
  const values = linkValues(link)
  const next = { ...responses }
  for (const fieldId of linkHiddenFieldIds(link)) {
    if (fieldId in values) next[fieldId] = values[fieldId]
  }
  return next
}

export function linkResponseFields(link: FormLink | null) {
  return link ? { formLinkId: link.id, formLinkLabel: link.label } : {}
}
