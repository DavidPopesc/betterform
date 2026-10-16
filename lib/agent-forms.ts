import crypto from 'crypto'
import type { NextResponse } from 'next/server'
import type { FormField } from '@/lib/form-schema'
import { ensureContractEmailField } from '@/lib/form-schema'
import { sha256Hex } from '@/lib/session'

// Agent-created ("vibe-coded") forms.
//
// An agent POSTs a form definition without any account. The form is created unowned
// (accountId = null) with responses disabled, and the agent gets back:
//   - previewUrl: safe to share, shows a read-only preview
//   - claimUrl:   secret, lets whoever opens it add the form to their account
//   - editToken:  secret, lets the agent keep revising the form until it's claimed
// Claiming assigns the owner, clears both tokens and turns responses on.

export const CLAIM_TTL_DAYS = 14
export const AGENT_CREATE_LIMIT_PER_HOUR = 20
export const MAX_FIELDS = 100
export const MAX_OPTIONS = 50

const PENDING_CLAIMS_COOKIE = 'bf_pending_claims'
const PENDING_CLAIMS_MAX_AGE = 60 * 60 * 24 // 1 day
const MAX_PENDING_CLAIMS = 10

export const AGENT_THEMES = ['slate', 'blue', 'green', 'purple', 'pink'] as const

const OPTION_TYPES = ['multiple_choice', 'checkboxes', 'dropdown'] as const

export const AGENT_FIELD_TYPES = [
  'short_text',
  'paragraph',
  'email',
  'phone',
  'multiple_choice',
  'checkboxes',
  'dropdown',
  'date',
  'time',
  'scale',
  'file_upload',
  'text',
  'section',
  'legal_text',
  'signature',
] as const

const NO_LABEL_REQUIRED = new Set(['text', 'section'])

export function getAppUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export function generateToken(prefix: 'bf_claim' | 'bf_edit') {
  return `${prefix}_${crypto.randomBytes(32).toString('base64url')}`
}

export function hashToken(token: string) {
  return sha256Hex(token)
}

export function hashIp(ip: string) {
  const secret = process.env.SESSION_JWT_SECRET || process.env.AUTH_SECRET || ''
  return crypto.createHmac('sha256', secret).update(ip).digest('hex')
}

export function getBearerToken(req: Request) {
  const header = req.headers.get('authorization')
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export type ValidationIssue = { path: string; message: string }

export type AgentFormInput = {
  name: string
  theme: (typeof AGENT_THEMES)[number]
  successMessage?: string
  fields: FormField[]
}

type Result<T> = { ok: true; value: T } | { ok: false; errors: ValidationIssue[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function newFieldId() {
  return `field_${crypto.randomBytes(5).toString('hex').slice(0, 7)}`
}

function newOptionId() {
  return `opt_${crypto.randomBytes(5).toString('hex').slice(0, 7)}`
}

function optionalString(
  raw: Record<string, unknown>,
  key: string,
  path: string,
  maxLength: number,
  errors: ValidationIssue[]
): string | undefined {
  const value = raw[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    errors.push({ path: `${path}.${key}`, message: 'must be a string' })
    return undefined
  }
  if (value.length > maxLength) {
    errors.push({ path: `${path}.${key}`, message: `must be at most ${maxLength} characters` })
    return undefined
  }
  return value
}

function parseField(raw: unknown, index: number, seenIds: Set<string>, errors: ValidationIssue[]): FormField | null {
  const path = `fields[${index}]`
  if (!isRecord(raw)) {
    errors.push({ path, message: 'must be an object like { "type": "short_text", "label": "Your name" }' })
    return null
  }

  const type = raw.type
  if (typeof type !== 'string' || !(AGENT_FIELD_TYPES as readonly string[]).includes(type)) {
    errors.push({ path: `${path}.type`, message: `must be one of: ${AGENT_FIELD_TYPES.join(', ')}` })
    return null
  }

  const errorCountBefore = errors.length

  let id: string
  if (raw.id !== undefined) {
    if (typeof raw.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(raw.id)) {
      errors.push({ path: `${path}.id`, message: 'must match ^[A-Za-z0-9_-]{1,64}$ (or omit it and one is generated)' })
      return null
    }
    id = raw.id
  } else {
    id = newFieldId()
  }
  if (seenIds.has(id)) {
    errors.push({ path: `${path}.id`, message: `duplicate field id "${id}"` })
    return null
  }
  seenIds.add(id)

  const label = optionalString(raw, 'label', path, 500, errors) ?? ''
  if (!label.trim() && !NO_LABEL_REQUIRED.has(type)) {
    errors.push({ path: `${path}.label`, message: 'is required' })
  }

  const field: FormField = {
    id,
    type,
    label,
    description: optionalString(raw, 'description', path, 5000, errors) ?? '',
  }

  if (raw.required !== undefined) {
    if (typeof raw.required !== 'boolean') errors.push({ path: `${path}.required`, message: 'must be a boolean' })
    else field.required = raw.required
  }

  if ((OPTION_TYPES as readonly string[]).includes(type)) {
    const options = raw.options
    if (!Array.isArray(options) || options.length < 1 || options.length > MAX_OPTIONS) {
      errors.push({ path: `${path}.options`, message: `must be an array of 1-${MAX_OPTIONS} strings, e.g. ["Yes", "No"]` })
    } else {
      field.options = []
      options.forEach((option, optionIndex) => {
        const optionLabel = typeof option === 'string' ? option : isRecord(option) ? option.label : undefined
        if (typeof optionLabel !== 'string' || !optionLabel.trim() || optionLabel.length > 500) {
          errors.push({ path: `${path}.options[${optionIndex}]`, message: 'must be a non-empty string (max 500 chars)' })
          return
        }
        field.options!.push({ id: newOptionId(), label: optionLabel.trim() })
      })
    }
  }

  if (type === 'scale') {
    const style = raw.scaleStyle ?? 'numbers'
    if (style !== 'numbers' && style !== 'stars' && style !== 'faces') {
      errors.push({ path: `${path}.scaleStyle`, message: 'must be "numbers", "stars" or "faces"' })
    }
    const max = raw.scaleMax ?? 5
    if (typeof max !== 'number' || !Number.isInteger(max) || max < 2 || max > 5) {
      errors.push({ path: `${path}.scaleMax`, message: 'must be an integer from 2 to 5' })
    }
    Object.assign(field, { scaleStyle: style, scaleMax: max })
  }

  if (type === 'file_upload') {
    const maxFiles = raw.maxFiles ?? 1
    if (typeof maxFiles !== 'number' || !Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 10) {
      errors.push({ path: `${path}.maxFiles`, message: 'must be an integer from 1 to 10' })
    } else {
      field.maxFiles = maxFiles
    }
    if (raw.allowedFileTypes !== undefined) {
      if (!Array.isArray(raw.allowedFileTypes) || raw.allowedFileTypes.some((t) => typeof t !== 'string')) {
        errors.push({ path: `${path}.allowedFileTypes`, message: 'must be an array of MIME patterns or extensions, e.g. ["image/*", ".pdf"]' })
      } else {
        field.allowedFileTypes = raw.allowedFileTypes as string[]
      }
    }
  }

  if (type === 'legal_text') {
    const content = optionalString(raw, 'content', path, 50000, errors)
    if (!content?.trim()) errors.push({ path: `${path}.content`, message: 'is required for legal_text (the contract body)' })
    else field.content = content
  }

  if (type === 'signature') {
    const mode = raw.signatureMode ?? 'either'
    if (mode !== 'draw' && mode !== 'type' && mode !== 'either') {
      errors.push({ path: `${path}.signatureMode`, message: 'must be "draw", "type" or "either"' })
    } else {
      field.signatureMode = mode
    }
  }

  return errors.length === errorCountBefore ? field : null
}

export function parseAgentFormInput(body: unknown): Result<AgentFormInput> {
  const errors: ValidationIssue[] = []
  if (!isRecord(body)) {
    return { ok: false, errors: [{ path: '', message: 'request body must be a JSON object' }] }
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) errors.push({ path: 'name', message: 'is required (the form title)' })
  else if (name.length > 200) errors.push({ path: 'name', message: 'must be at most 200 characters' })

  const theme = body.theme ?? 'blue'
  if (typeof theme !== 'string' || !(AGENT_THEMES as readonly string[]).includes(theme)) {
    errors.push({ path: 'theme', message: `must be one of: ${AGENT_THEMES.join(', ')}` })
  }

  const successMessage = optionalString(body, 'successMessage', '', 500, errors)

  const fields: FormField[] = []
  if (!Array.isArray(body.fields) || body.fields.length < 1) {
    errors.push({ path: 'fields', message: 'must be a non-empty array of fields' })
  } else if (body.fields.length > MAX_FIELDS) {
    errors.push({ path: 'fields', message: `must have at most ${MAX_FIELDS} fields` })
  } else {
    const seenIds = new Set<string>()
    body.fields.forEach((raw, index) => {
      const field = parseField(raw, index, seenIds, errors)
      if (field) fields.push(field)
    })
  }

  if (errors.length > 0) return { ok: false, errors }

  // Signature fields need a required, verified email — same guard the editor applies.
  const guardedFields = fields.some((f) => f.type === 'signature') ? ensureContractEmailField(fields) : fields

  return {
    ok: true,
    value: {
      name,
      theme: theme as AgentFormInput['theme'],
      successMessage: successMessage?.trim() || undefined,
      fields: guardedFields,
    },
  }
}

// ---------------------------------------------------------------------------
// Claiming
// ---------------------------------------------------------------------------

/**
 * Assign every still-claimable form matching `tokens` to `accountId`.
 * Each update is guarded on `accountId: null`, so a token can only ever be claimed once
 * even if two requests race. Returns the ids of the forms this call claimed.
 */
export async function claimFormsForAccount(accountId: string, tokens: string[]): Promise<string[]> {
  if (tokens.length === 0) return []
  const { default: prisma } = await import('@/lib/db')

  const candidates = await prisma.form.findMany({
    where: {
      claimTokenHash: { in: tokens.map(hashToken) },
      accountId: null,
      claimExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  })

  const claimed: string[] = []
  for (const { id } of candidates) {
    const result = await prisma.form.updateMany({
      where: { id, accountId: null },
      data: {
        accountId,
        claimedAt: new Date(),
        claimTokenHash: null,
        editTokenHash: null,
        claimExpiresAt: null,
        responsesEnabled: true,
      },
    })
    if (result.count === 1) claimed.push(id)
  }
  return claimed
}

// Claim tokens are parked in a short-lived cookie while the user signs up or logs in.
// Every auth flow lands on /dashboard, which hands off to /api/claim/complete.

type CookieReader = { get(name: string): { value: string } | undefined }

export function readPendingClaimTokens(cookieStore: CookieReader): string[] {
  const raw = cookieStore.get(PENDING_CLAIMS_COOKIE)?.value
  if (!raw) return []
  return raw.split('.').filter((token) => /^bf_claim_[A-Za-z0-9_-]+$/.test(token))
}

export function setPendingClaimTokens(response: NextResponse, tokens: string[]) {
  const unique = Array.from(new Set(tokens)).slice(-MAX_PENDING_CLAIMS)
  response.cookies.set(PENDING_CLAIMS_COOKIE, unique.join('.'), {
    maxAge: PENDING_CLAIMS_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export function clearPendingClaimTokens(response: NextResponse) {
  response.cookies.set(PENDING_CLAIMS_COOKIE, '', { path: '/', maxAge: 0, expires: new Date(0) })
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export function serializeAgentForm(form: {
  id: string
  publicId: string
  name: string | null
  theme: string
  successMessage: string
  schema: unknown
  claimExpiresAt: Date | null
}) {
  const appUrl = getAppUrl()
  const schema = (form.schema ?? {}) as { fields?: unknown[] }
  return {
    formId: form.id,
    name: form.name,
    theme: form.theme,
    successMessage: form.successMessage,
    fields: schema.fields ?? [],
    previewUrl: `${appUrl}/preview/${form.publicId}`,
    expiresAt: form.claimExpiresAt?.toISOString() ?? null,
  }
}

export function claimUrlFor(token: string) {
  return `${getAppUrl()}/claim/${token}`
}
