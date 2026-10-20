// Decodes form definitions packed into a /new#… link, so an AI with no tools at all can
// hand the user a working form by writing a URL. Runs in the browser: the fragment never
// reaches the server, and nothing is stored until the user clicks "Add to my account".
//
// Accepted fragments:
//   #j=<base64url JSON>                   same definition as POST /api/agent/forms
//   #z=<base64url deflate-raw JSON>       compressed, for agents that can run code
//   #json=<percent-encoded JSON>
//   #title=…&q=type[*]:Label&o=…          readable format, see parseReadableFormat

export type FormLinkResult = { ok: true; definition: Record<string, unknown> } | { ok: false; message: string }

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function inflateRaw(bytes: Uint8Array) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

function parseJson(text: string): FormLinkResult {
  try {
    const value = JSON.parse(text)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { ok: false, message: 'The form data must be a JSON object.' }
    }
    return { ok: true, definition: value }
  } catch {
    return { ok: false, message: 'The form data is not valid JSON. The link may have been cut off or mistyped.' }
  }
}

// Field type names an AI is likely to guess, mapped to the real ones. Keys are normalized
// (lowercase, `-` and spaces turned into `_`) before lookup.
const TYPE_ALIASES: Record<string, string> = {
  short_answer: 'short_text',
  short: 'short_text',
  shorttext: 'short_text',
  long_answer: 'paragraph',
  long_text: 'paragraph',
  textarea: 'paragraph',
  radio: 'multiple_choice',
  single_choice: 'multiple_choice',
  choice: 'multiple_choice',
  checkbox: 'checkboxes',
  multi_select: 'checkboxes',
  select: 'dropdown',
  rating: 'scale',
  file: 'file_upload',
  upload: 'file_upload',
  heading: 'text',
  page_break: 'section',
  contract: 'legal_text',
  terms: 'legal_text',
  phone_number: 'phone',
}

function normalizeType(raw: string) {
  const key = raw.trim().toLowerCase().replace(/[-\s]+/g, '_')
  return TYPE_ALIASES[key] ?? key
}

// Properties a readable-format param sets on the most recent `q=` field.
const FIELD_PARAMS: Record<string, (field: Record<string, unknown>, value: string) => void> = {
  o: (field, value) => {
    field.options = [...((field.options as string[]) ?? []), value]
  },
  d: (field, value) => {
    field.description = value
  },
  content: (field, value) => {
    field.content = value
  },
  style: (field, value) => {
    field.scaleStyle = value
  },
  max: (field, value) => {
    field.scaleMax = Number(value)
  },
  files: (field, value) => {
    field.maxFiles = Number(value)
  },
  accept: (field, value) => {
    field.allowedFileTypes = value.split(',').map((type) => type.trim()).filter(Boolean)
  },
  mode: (field, value) => {
    field.signatureMode = value
  },
}

/**
 * Readable format, order-sensitive:
 *   title=Form+name        (required)   theme=blue   success=Thanks!
 *   q=<type>[*]:<label>    starts a field; `*` marks it required; the label may contain colons
 *   o=, d=, content=, style=, max=, files=, accept=, mode=   apply to the field before them
 */
export function parseReadableFormat(params: URLSearchParams): FormLinkResult {
  const definition: Record<string, unknown> = {}
  const fields: Record<string, unknown>[] = []

  for (const [key, value] of params.entries()) {
    if (key === 'title') definition.name = value
    else if (key === 'theme') definition.theme = value
    else if (key === 'success') definition.successMessage = value
    else if (key === 'q') {
      const separator = value.indexOf(':')
      const rawType = (separator === -1 ? value : value.slice(0, separator)).trim()
      const required = rawType.endsWith('*')
      fields.push({
        type: normalizeType(required ? rawType.slice(0, -1) : rawType),
        label: separator === -1 ? '' : value.slice(separator + 1).trim(),
        ...(required ? { required: true } : {}),
      })
    } else if (FIELD_PARAMS[key]) {
      const current = fields[fields.length - 1]
      if (!current) return { ok: false, message: `"${key}=" must come after a "q=" field.` }
      FIELD_PARAMS[key](current, value)
    }
  }

  definition.fields = fields
  return { ok: true, definition }
}

export async function decodeFormLink(hash: string): Promise<FormLinkResult> {
  // Accepts the fragment (#…, preferred: never sent to the server) or a query string (?…).
  const fragment = hash.replace(/^[#?]/, '')
  if (!fragment) return { ok: false, message: 'This link has no form in it.' }

  const params = new URLSearchParams(fragment)
  try {
    const compressed = params.get('z')
    if (compressed) return parseJson(await inflateRaw(base64UrlToBytes(compressed)))

    const encoded = params.get('j')
    if (encoded) return parseJson(new TextDecoder().decode(base64UrlToBytes(encoded)))

    const json = params.get('json')
    if (json) return parseJson(json)
  } catch {
    return { ok: false, message: 'The form data could not be decoded. The link may have been cut off or mistyped.' }
  }

  if (params.has('title') || params.has('q')) return parseReadableFormat(params)
  return { ok: false, message: 'This link has no form in it.' }
}
