import crypto from 'crypto'
import path from 'path'
import type { Prisma, PrismaClient } from '@/lib/generated/prisma'
import { isOwnBlobUrl } from '@/lib/blob'
import { hasEmailSubmitted, hasFormAccountSubmitted, getVerifiedEmails } from '@/lib/form-account'
import { sendFormSubmissionAlert, sendSignedContractEmail } from '@/lib/email'
import { isSignatureValueEmpty } from '@/lib/form-schema'
import { renderContractPdf } from '@/lib/contract-pdf'

export type SubmissionField = {
  id: string
  type: string
  label?: string
  required?: boolean
  requireVerifiedEmail?: boolean
  allowedFileTypes?: string[]
  maxFiles?: number
  options?: Array<{ id: string; label: string }>
  content?: string
}

export type UploadedAttachmentInput = {
  filename: string
  mimeType?: string | null
  size?: number
  url: string
}

export type SubmissionFormMeta = {
  id: string
  name: string | null
  schema: unknown
  oneResponsePerEmail: boolean
  oneResponsePerUser: boolean
  webhookUrl: string | null
  submissionApiKey: string | null
  notifyOnFormSubmission: boolean
  account: { email: string } | null
}

export type ValidationError = { error: string; message?: string; status: number }

export type SubmissionContext = {
  respondentEmail: string | null
  isContractForm: boolean
  fileFields: SubmissionField[]
  schemaFields: SubmissionField[]
}

function isPrivateIPv4(ip: string) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true // fail closed on malformed input
  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
  )
}

function isPrivateIPv6(ip: string) {
  const normalized = ip.toLowerCase()
  if (normalized === '::1' || normalized === '::') return true
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.split(':').pop() || ''
    return isPrivateIPv4(mapped)
  }
  return false
}

// Sends a webhook notification (validates URL, blocks local/internal addresses
// including via DNS resolution, and enforces timeout)
async function sendWebhookNotification(webhookUrl: string, payload: unknown, apiKey: string) {
  try {
    const parsed = new URL(webhookUrl)
    if (parsed.protocol !== 'https:') {
      console.error('Webhook URL must be https:', webhookUrl)
      return
    }

    const hostname = parsed.hostname
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      console.error('Webhook URL hostname not allowed:', hostname)
      return
    }

    // Resolve the hostname ourselves and check every returned address —
    // checking only the literal hostname string lets an attacker-controlled
    // domain name resolve (via its own DNS record) to a private/internal
    // address and bypass a literal-IP-only check.
    const { lookup } = await import('dns/promises')
    let resolvedAddresses: { address: string; family: number }[]
    try {
      resolvedAddresses = await lookup(hostname, { all: true, verbatim: true })
    } catch (err) {
      console.error('Webhook URL DNS resolution failed, blocked:', hostname, err)
      return
    }

    const hasPrivateAddress = resolvedAddresses.some((entry) =>
      entry.family === 6 ? isPrivateIPv6(entry.address) : isPrivateIPv4(entry.address)
    )
    if (resolvedAddresses.length === 0 || hasPrivateAddress) {
      console.error('Webhook URL resolves to a private/internal address, blocked:', hostname)
      return
    }

    const signature = crypto.createHmac('sha256', apiKey).update(JSON.stringify(payload)).digest('hex')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BetterForm-Signature': signature,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: 'error',
      })

      if (!response.ok) {
        console.error('Webhook delivery failed:', response.status, response.statusText)
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    console.error('Webhook notification error:', err)
  }
}

// Runs every pre-creation check a submission must pass, shared between the immediate
// (non-payment) submit path and the pre-payment validation done before a PaymentIntent
// is created — both must reject bad submissions before anything is persisted or charged.
export async function validateSubmissionPreconditions(params: {
  form: SubmissionFormMeta
  publicId: string
  responses: Record<string, unknown>
  uploadedAttachmentsByField: Record<string, UploadedAttachmentInput[]>
  isApiRequest: boolean
  formAccountId: string | null
  ip: string | null
}): Promise<{ ok: true; context: SubmissionContext } | { ok: false; error: ValidationError }> {
  const { form, publicId, responses, uploadedAttachmentsByField, isApiRequest, formAccountId, ip } = params
  const schemaFields = ((form.schema as { fields?: SubmissionField[] } | null)?.fields || [])

  const emailField = schemaFields.find((f) => f.type === 'email')
  const respondentEmail = emailField ? String(responses[emailField.id] || '').toLowerCase().trim() : null

  const signatureFields = schemaFields.filter((f) => f.type === 'signature')
  const isContractForm = signatureFields.length > 0

  if (isContractForm) {
    if (!emailField?.requireVerifiedEmail || !respondentEmail) {
      return {
        ok: false,
        error: {
          error: 'contract_requires_verified_email',
          message: 'This contract requires a verified email address to identify the signer.',
          status: 403,
        },
      }
    }

    if (!isApiRequest && (!ip || ip === 'unknown')) {
      return {
        ok: false,
        error: {
          error: 'ip_required',
          message: 'Unable to determine your IP address, which is required to sign this contract.',
          status: 403,
        },
      }
    }

    const missingSignature = signatureFields.find(
      (field) => field.required && isSignatureValueEmpty(responses[field.id])
    )
    if (missingSignature) {
      return {
        ok: false,
        error: { error: 'signature_required', message: 'Please provide your signature before submitting.', status: 400 },
      }
    }
  }

  if (!isApiRequest && emailField?.requireVerifiedEmail && respondentEmail) {
    const verifiedEmails = await getVerifiedEmails(formAccountId!)
    const isVerified = verifiedEmails.some((e) => e.toLowerCase().trim() === respondentEmail)
    if (!isVerified) {
      return {
        ok: false,
        error: { error: 'email_not_verified', message: 'Please verify your email address before submitting.', status: 403 },
      }
    }
  }

  if (!isApiRequest && form.oneResponsePerUser && formAccountId) {
    const hasSubmitted = await hasFormAccountSubmitted(formAccountId, form.id)
    if (hasSubmitted) {
      return {
        ok: false,
        error: { error: 'already_submitted', message: 'You have already submitted this form.', status: 403 },
      }
    }
  }

  if (form.oneResponsePerEmail && respondentEmail) {
    const emailSubmitted = await hasEmailSubmitted(respondentEmail, form.id)
    if (emailSubmitted) {
      return {
        ok: false,
        error: {
          error: 'email_already_submitted',
          message: 'This email address has already been used to submit this form.',
          status: 403,
        },
      }
    }
  }

  const fileFields = schemaFields.filter((field) => field.type === 'file_upload')
  for (const field of fileFields) {
    const fieldFiles = uploadedAttachmentsByField[field.id] || []
    const maxFiles = Math.min(field.maxFiles || 1, 10)

    if (fieldFiles.length > maxFiles) {
      return {
        ok: false,
        error: {
          error: 'too_many_files',
          message: `You can upload up to ${maxFiles} file${maxFiles === 1 ? '' : 's'} for this field.`,
          status: 400,
        },
      }
    }

    const invalidFile = fieldFiles.find((file) => typeof file.size === 'number' && file.size > 10 * 1024 * 1024)
    if (invalidFile) {
      return {
        ok: false,
        error: { error: 'file_too_large', message: `${invalidFile.filename} is larger than the 10 MB file limit.`, status: 400 },
      }
    }

    const allowedTypes = (field.allowedFileTypes || []).map((t) => t.trim()).filter(Boolean)
    const expectedPathPrefix = `forms/${publicId}/${field.id}/`
    const disallowedFile = fieldFiles.find((file) => {
      if (!isOwnBlobUrl(file.url, expectedPathPrefix)) return true
      if (allowedTypes.length === 0) return false

      const fileExtension = path.extname(file.filename).toLowerCase()
      const fileMimeType = (file.mimeType || '').toLowerCase()

      return !allowedTypes.some((allowedType) => {
        const normalized = allowedType.trim().toLowerCase()
        if (!normalized) return false
        if (normalized.startsWith('.')) return fileExtension === normalized
        if (normalized.endsWith('/*')) {
          const prefix = normalized.slice(0, -1)
          return fileMimeType.startsWith(prefix)
        }
        return fileMimeType === normalized
      })
    })
    if (disallowedFile) {
      return {
        ok: false,
        error: { error: 'invalid_file_type', message: `${disallowedFile.filename} is not an allowed file type.`, status: 400 },
      }
    }
  }

  return { ok: true, context: { respondentEmail, isContractForm, fileFields, schemaFields } }
}

// Frozen field snapshot + audit-trail columns for contract (signature) forms — {} otherwise.
export function buildContractFields(params: {
  isContractForm: boolean
  deviceMetrics: Record<string, unknown> | null
  clientDeviceMetadata: Record<string, unknown> | null
  schemaFields: SubmissionField[]
}): Record<string, unknown> {
  if (!params.isContractForm) return {}
  return {
    respondentUserAgent: (params.deviceMetrics?.userAgent as string | undefined) || null,
    deviceMetadata: { ...(params.deviceMetrics || {}), ...(params.clientDeviceMetadata || {}) },
    signedAt: new Date(),
    locked: true,
    lockedAt: new Date(),
    contractSnapshot: params.schemaFields,
  }
}

// Creates the Response row and runs every post-creation side effect (attachment rows,
// signed-contract PDF emails, outbound webhook, owner notification email). Shared by the
// immediate (non-payment) submit path and the payment-finalize path (return-call + webhook).
export async function createFormResponse(params: {
  prisma: PrismaClient
  form: SubmissionFormMeta
  publicId: string
  schemaFields: SubmissionField[]
  fileFields: SubmissionField[]
  responses: Record<string, unknown>
  respondentEmail: string | null
  formAccountId: string | null
  ip: string | null
  submissionLocation: Record<string, unknown> | null
  uploadedAttachmentsByField: Record<string, UploadedAttachmentInput[]>
  isContractForm: boolean
  extraFields: Record<string, unknown>
}) {
  const {
    prisma,
    form,
    publicId,
    schemaFields,
    fileFields,
    responses,
    respondentEmail,
    formAccountId,
    ip,
    submissionLocation,
    uploadedAttachmentsByField,
    isContractForm,
    extraFields,
  } = params

  const response = await prisma.response.create({
    data: {
      formId: form.id,
      response: responses as Prisma.InputJsonValue,
      respondentIp: ip,
      respondentEmail,
      formAccountId,
      ...(submissionLocation ? { submissionLocation: submissionLocation as Prisma.InputJsonValue } : {}),
      processed: false,
      ...extraFields,
    },
  })

  const storedResponses: Record<string, unknown> = { ...responses }

  if (fileFields.length > 0) {
    for (const field of fileFields) {
      const fieldFiles = uploadedAttachmentsByField[field.id] || []
      if (fieldFiles.length === 0) continue

      const attachmentMetadata = []

      for (const file of fieldFiles) {
        const attachmentId = crypto.randomUUID()

        await prisma.attachment.create({
          data: {
            id: attachmentId,
            responseId: response.id,
            filename: file.filename,
            mimeType: file.mimeType || null,
            size: typeof file.size === 'number' ? file.size : null,
            url: file.url,
          },
        })

        attachmentMetadata.push({
          attachmentId,
          filename: file.filename,
          mimeType: file.mimeType || null,
          size: typeof file.size === 'number' ? file.size : null,
          url: `/api/attachments/${attachmentId}`,
        })
      }

      storedResponses[field.id] = attachmentMetadata
    }

    await prisma.response.update({
      where: { id: response.id },
      data: { response: storedResponses as Prisma.InputJsonValue },
    })
  }

  // Signed contracts are always emailed (as a PDF) to both the signer and the form owner,
  // regardless of the form's `notifyOnFormSubmission` setting.
  if (isContractForm && respondentEmail) {
    try {
      const fieldsForPdf = schemaFields.filter((field) => field.type !== 'section')
      const pdfBuffer = await renderContractPdf({
        formName: form.name || 'Untitled form',
        fields: fieldsForPdf,
        responses: storedResponses,
        signedAt: response.createdAt,
        respondentIp: ip,
        respondentEmail,
        deviceMetadata: extraFields.deviceMetadata as Record<string, unknown> | undefined,
      })

      const recipients = [respondentEmail, form.account?.email].filter(
        (email): email is string => !!email && email.toLowerCase() !== respondentEmail.toLowerCase()
      )
      recipients.unshift(respondentEmail)
      const uniqueRecipients = Array.from(new Set(recipients.map((email) => email.toLowerCase()))).map(
        (lower) => recipients.find((email) => email.toLowerCase() === lower)!
      )

      for (const to of uniqueRecipients) {
        await sendSignedContractEmail({
          to,
          formName: form.name || 'Untitled form',
          fields: fieldsForPdf,
          responses: storedResponses,
          pdfBuffer,
          signedAt: response.createdAt,
        }).catch((err) => {
          console.error('Signed contract email failed:', err)
        })
      }
    } catch (err) {
      console.error('Signed contract PDF generation failed:', err)
    }
  }

  if (form.webhookUrl && form.submissionApiKey) {
    const webhookPayload = {
      formId: form.id,
      responseId: response.id,
      responses,
      respondentEmail,
      submittedAt: response.createdAt,
    }

    sendWebhookNotification(form.webhookUrl, webhookPayload, form.submissionApiKey).catch((err) => {
      console.error('Webhook notification failed:', err)
    })
  }

  if (form.notifyOnFormSubmission && form.account?.email) {
    const responsePreview = schemaFields
      .filter((field) => field.type !== 'section')
      .map((field) => {
        const rawValue = storedResponses[field.id]
        if (rawValue === undefined || rawValue === null || rawValue === '') return null

        let displayValue = ''
        if (['multiple_choice', 'dropdown'].includes(field.type)) {
          const option = field.options?.find((item) => item.id === String(rawValue))
          displayValue = option?.label || String(rawValue)
        } else if (field.type === 'checkboxes' && Array.isArray(rawValue)) {
          displayValue = rawValue
            .map((item) => field.options?.find((option) => option.id === String(item))?.label || String(item))
            .join(', ')
        } else if (field.type === 'file_upload' && Array.isArray(rawValue)) {
          displayValue = rawValue
            .map((item) =>
              typeof item === 'object' && item !== null && 'filename' in item
                ? String((item as { filename: unknown }).filename)
                : typeof item === 'object' && item !== null
                  ? 'Uploaded file'
                  : String(item)
            )
            .join(', ')
        } else if (typeof rawValue === 'object') {
          displayValue = JSON.stringify(rawValue)
        } else {
          displayValue = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue)
        }

        return { label: field.label || field.id, value: displayValue }
      })
      .filter((item): item is { label: string; value: string } => item !== null)

    await sendFormSubmissionAlert({
      to: form.account.email,
      formName: form.name || 'Untitled form',
      publicId,
      responses: storedResponses,
      responsePreview,
      respondentEmail,
      submittedAt: response.createdAt,
    }).catch((err) => {
      console.error('Submission alert email failed:', err)
    })
  }

  return { response, storedResponses }
}
