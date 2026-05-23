export type FormFieldOption = {
  id: string
  label: string
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
