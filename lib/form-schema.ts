export type FormFieldOption = {
  id: string
  label: string
}

export type SignatureMode = 'draw' | 'type' | 'either'

export type SignatureValue = {
  mode: 'draw' | 'type'
  dataUrl?: string
  text?: string
  font?: string
}

export type FormField = {
  id: string
  type: string
  label: string
  description?: string
  required?: boolean
  requireVerifiedEmail?: boolean
  options?: FormFieldOption[]
  allowedFileTypes?: string[]
  maxFiles?: number
  points?: number
  correctAnswer?: string | string[]
  // `legal_text` fields
  content?: string
  // `signature` fields
  signatureMode?: SignatureMode
  // set on the contract's required verified-email field; blocks deletion/toggling in the Editor
  contractLocked?: boolean
}

export function isSignatureValueEmpty(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true
  const sig = value as SignatureValue
  const hasDrawing = typeof sig.dataUrl === 'string' && sig.dataUrl.trim().length > 0
  const hasTypedText = typeof sig.text === 'string' && sig.text.trim().length > 0
  return !hasDrawing && !hasTypedText
}

export type PrefillLinkConfig = {
  id: string
  name: string
  values: Record<string, unknown>
  hiddenFieldIds: string[]
  createdAt: string
}

export type LimitedPublicViewConfig = {
  id: string
  name: string
  filterFieldId: string
  filterValue: string
  visibleFieldIds: string[]
  createdAt: string
  updatedAt?: string
}

export type FormSchema = {
  fields: FormField[]
  prefills: PrefillLinkConfig[]
  limitedPublicViews: LimitedPublicViewConfig[]
}

export function parseFormSchema(input: unknown): FormSchema {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}

  return {
    fields: Array.isArray(raw.fields) ? raw.fields as FormField[] : [],
    prefills: Array.isArray(raw.prefills) ? raw.prefills as PrefillLinkConfig[] : [],
    limitedPublicViews: Array.isArray(raw.limitedPublicViews)
      ? raw.limitedPublicViews as LimitedPublicViewConfig[]
      : [],
  }
}

// Ensures a form has a required, verified email field — reuses an existing `email`
// field if present, otherwise inserts one at the top of the list. Mirrors the
// signature-field contract lock in the Editor (components/form-editor/Editor.tsx).
export function ensureContractEmailField(fields: FormField[]): FormField[] {
  const existingEmailIdx = fields.findIndex((f) => f.type === 'email')
  if (existingEmailIdx !== -1) {
    const next = [...fields]
    next[existingEmailIdx] = {
      ...next[existingEmailIdx],
      required: true,
      requireVerifiedEmail: true,
      contractLocked: true,
    }
    return next
  }
  const emailField: FormField = {
    id: `field_${Math.random().toString(36).slice(2, 9)}`,
    type: 'email',
    label: 'Email address',
    description: '',
    required: true,
    requireVerifiedEmail: true,
    contractLocked: true,
  }
  return [emailField, ...fields]
}

// Releases the contract lock on the verified email field once nothing on the form
// still requires it (no signature field, no payment requirement).
export function releaseContractLockIfUnused(fields: FormField[]): FormField[] {
  const hasSignature = fields.some((f) => f.type === 'signature')
  if (hasSignature) return fields
  return fields.map((f) => (f.contractLocked ? { ...f, contractLocked: false } : f))
}

export function withUpdatedSchema(input: unknown, updates: Partial<FormSchema>) {
  const schema = parseFormSchema(input)
  return {
    ...schema,
    ...updates,
  }
}

export function normalizeValueForMatch(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).join('|')
  }

  return String(value ?? '').trim().toLowerCase()
}
