import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import type { Prisma } from '@/lib/generated/prisma'
import { 
  getOrCreateFormAccountId, 
  getClientIp, 
  getDeviceMetrics, 
  updateFormAccountTracking,
  hasFormAccountSubmitted,
  hasEmailSubmitted,
  getVerifiedEmails 
} from '@/lib/form-account'
import { sendFormSubmissionAlert } from '@/lib/email'

type FileUploadField = {
  id: string
  type: string
  requireVerifiedEmail?: boolean
  allowedFileTypes?: string[]
  maxFiles?: number
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function matchesAllowedFileType(file: File, allowedTypes: string[]) {
  if (allowedTypes.length === 0) return true

  const fileExtension = path.extname(file.name).toLowerCase()
  const fileMimeType = file.type.toLowerCase()

  return allowedTypes.some((allowedType) => {
    const normalized = allowedType.trim().toLowerCase()
    if (!normalized) return false
    if (normalized.startsWith('.')) return fileExtension === normalized
    if (normalized.endsWith('/*')) {
      const prefix = normalized.slice(0, -1)
      return fileMimeType.startsWith(prefix)
    }
    return fileMimeType === normalized
  })
}

// Helper to send webhook notification (validates URL, blocks local IPs, and enforces timeout)
async function sendWebhookNotification(webhookUrl: string, payload: unknown, apiKey: string) {
  // Validate URL and disallow non-HTTPS or internal addresses
  try {
    const parsed = new URL(webhookUrl)
    if (parsed.protocol !== 'https:') {
      console.error('Webhook URL must be https:', webhookUrl)
      return
    }

    const hostname = parsed.hostname
    // Block obvious local/internal hostnames and IP ranges
    const isIpv4 = /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      console.error('Webhook URL hostname not allowed:', hostname)
      return
    }

    if (isIpv4) {
      const parts = hostname.split('.').map((n) => Number(n))
      if (
        parts[0] === 10 ||
        parts[0] === 127 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 169 && parts[1] === 254)
      ) {
        console.error('Webhook URL resolves to private IP, blocked:', hostname)
        return
      }
    }

    // Create signature for webhook verification
    const signature = crypto.createHmac('sha256', apiKey).update(JSON.stringify(payload)).digest('hex')

    // Use AbortController to enforce timeout and prevent hanging requests
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId?: string }> }
) {
  try {
    const resolvedParams = (await params) as { publicId?: string }
    const publicId = resolvedParams?.publicId
    if (!publicId) {
      return NextResponse.json({ error: 'invalid_public_id' }, { status: 400 })
    }

    // Check for API key authentication
    const authHeader = req.headers.get('authorization')
    const apiKeyFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    // Find form by publicId
    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({
      where: { publicId },
      select: { 
        id: true, 
        name: true,
        publicId: true,
        schema: true,
        responsesEnabled: true,
        responseDeadline: true,
        oneResponsePerEmail: true,
        oneResponsePerUser: true,
        apiEnabled: true,
        submissionApiKey: true,
        webhookUrl: true,
        account: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'form_not_found' }, { status: 404 })
    }

    // Verify API key if provided
    const isApiRequest = !!apiKeyFromHeader
    if (isApiRequest) {
      if (!form.apiEnabled || form.submissionApiKey !== apiKeyFromHeader) {
        return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
      }
    }

    // Check if form is accepting responses
    if (!form.responsesEnabled) {
      return NextResponse.json({ 
        error: 'form_closed',
        message: 'This form is not accepting responses.'
      }, { status: 403 })
    }

    if (form.responseDeadline && new Date() > new Date(form.responseDeadline)) {
      return NextResponse.json({ 
        error: 'deadline_passed',
        message: 'The response deadline has passed.'
      }, { status: 403 })
    }

    let responses: Record<string, unknown>
    const uploadedFiles = new Map<string, File[]>()
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const rawResponses = formData.get('responses')

      if (typeof rawResponses !== 'string') {
        return NextResponse.json({ error: 'invalid_response_data' }, { status: 400 })
      }

      responses = JSON.parse(rawResponses) as Record<string, unknown>

      for (const [key, value] of formData.entries()) {
        if (!key.startsWith('file__') || !(value instanceof File)) continue
        const fieldId = key.replace('file__', '')
        const fieldFiles = uploadedFiles.get(fieldId) || []
        fieldFiles.push(value)
        uploadedFiles.set(fieldId, fieldFiles)
      }
    } else {
      const body = await req.json()
      responses = body.responses as Record<string, unknown>
    }

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'invalid_response_data' }, { status: 400 })
    }

    // For API requests, skip form account tracking
    let formAccountId = null
    let ip = null

    if (!isApiRequest) {
      // Get or create form account ID
      formAccountId = await getOrCreateFormAccountId()

      // Get client IP and device metrics
      ip = getClientIp(req.headers)
      const deviceMetrics = getDeviceMetrics(req.headers)

      // Update form account tracking
      await updateFormAccountTracking(formAccountId, {
        ip,
        deviceMetrics,
        formViewed: form.id,
      })
    }

    // Extract email from responses (check for email field)
    const schema = form.schema as { fields?: FileUploadField[] }
    const emailField = schema.fields?.find(f => f.type === 'email')
    const respondentEmail = emailField ? String(responses[emailField.id] || '').toLowerCase().trim() : null

    // Check if email field requires verification (only for non-API requests)
    if (!isApiRequest && emailField && respondentEmail) {
      const emailFieldSettings = schema.fields?.find(f => f.id === emailField.id) as { requireVerifiedEmail?: boolean } | undefined
      
      if (emailFieldSettings?.requireVerifiedEmail) {
        // Check if email is verified
        const verifiedEmails = await getVerifiedEmails(formAccountId!)
        const isVerified = verifiedEmails.some(e => e.toLowerCase().trim() === respondentEmail)
        
        if (!isVerified) {
          return NextResponse.json({ 
            error: 'email_not_verified',
            message: 'Please verify your email address before submitting.'
          }, { status: 403 })
        }
      }
    }

    // Check one response per user (form account) - only for non-API requests
    if (!isApiRequest && form.oneResponsePerUser && formAccountId) {
      const hasSubmitted = await hasFormAccountSubmitted(formAccountId, form.id)
      if (hasSubmitted) {
        return NextResponse.json({ 
          error: 'already_submitted',
          message: 'You have already submitted this form.'
        }, { status: 403 })
      }
    }

    // Check one response per email
    if (form.oneResponsePerEmail && respondentEmail) {
      const emailSubmitted = await hasEmailSubmitted(respondentEmail, form.id)
      if (emailSubmitted) {
        return NextResponse.json({ 
          error: 'email_already_submitted',
          message: 'This email address has already been used to submit this form.'
        }, { status: 403 })
      }
    }

    const fileFields = (schema.fields || []).filter((field) => field.type === 'file_upload')
    for (const field of fileFields) {
      const fieldFiles = uploadedFiles.get(field.id) || []
      const maxFiles = Math.min(field.maxFiles || 1, 10)

      if (fieldFiles.length > maxFiles) {
        return NextResponse.json({
          error: 'too_many_files',
          message: `You can upload up to ${maxFiles} file${maxFiles === 1 ? '' : 's'} for this field.`,
        }, { status: 400 })
      }

      const invalidFile = fieldFiles.find((file) => file.size > 10 * 1024 * 1024)
      if (invalidFile) {
        return NextResponse.json({
          error: 'file_too_large',
          message: `${invalidFile.name} is larger than the 10 MB file limit.`,
        }, { status: 400 })
      }

      const allowedTypes = field.allowedFileTypes || []
      const disallowedFile = fieldFiles.find((file) => !matchesAllowedFileType(file, allowedTypes))
      if (disallowedFile) {
        return NextResponse.json({
          error: 'invalid_file_type',
          message: `${disallowedFile.name} is not an allowed file type.`,
        }, { status: 400 })
      }
    }

    // Create response record
    const response = await prisma.response.create({
      data: {
        formId: form.id,
        response: responses as Prisma.InputJsonValue,
        respondentIp: ip,
        respondentEmail,
        formAccountId,
        processed: false,
      },
    })

    const storedResponses: Record<string, unknown> = { ...responses }

    if (fileFields.length > 0) {
      const uploadBaseDirectory = path.join(process.cwd(), 'uploads', form.id, response.id)
      await mkdir(uploadBaseDirectory, { recursive: true })

      for (const field of fileFields) {
        const fieldFiles = uploadedFiles.get(field.id) || []
        if (fieldFiles.length === 0) continue

        const attachmentMetadata = []

        for (const file of fieldFiles) {
          const attachmentId = crypto.randomUUID()
          const safeFilename = sanitizeFilename(file.name)
          const storageKey = path.join('uploads', form.id, response.id, `${attachmentId}-${safeFilename}`)
          const filePath = path.join(process.cwd(), storageKey)
          const buffer = Buffer.from(await file.arrayBuffer())

          await writeFile(filePath, buffer)

          await prisma.attachment.create({
            data: {
              id: attachmentId,
              responseId: response.id,
              filename: file.name,
              mimeType: file.type || null,
              size: file.size,
              url: storageKey,
            },
          })

          attachmentMetadata.push({
            attachmentId,
            filename: file.name,
            mimeType: file.type || null,
            size: file.size,
            url: `/api/attachments/${attachmentId}`,
          })
        }

        storedResponses[field.id] = attachmentMetadata
      }

      await prisma.response.update({
        where: { id: response.id },
        data: {
          response: storedResponses as Prisma.InputJsonValue,
        },
      })
    }

    // Track submission in form account (for non-API requests)
    if (!isApiRequest && formAccountId) {
      await updateFormAccountTracking(formAccountId, {
        formSubmitted: form.id,
      })
    }

    // Send webhook notification if configured
    if (form.webhookUrl && form.submissionApiKey) {
      const webhookPayload = {
        formId: form.id,
        responseId: response.id,
        responses,
        respondentEmail,
        submittedAt: response.createdAt,
      }
      
      // Send webhook asynchronously (don't wait for it)
      sendWebhookNotification(form.webhookUrl, webhookPayload, form.submissionApiKey).catch(err => {
        console.error('Webhook notification failed:', err)
      })
    }

    if (form.account?.email) {
      sendFormSubmissionAlert({
        to: form.account.email,
        formName: form.name || 'Untitled form',
        publicId,
        responseId: response.id,
        responses: storedResponses,
        respondentEmail,
        submittedAt: response.createdAt,
      }).catch((err) => {
        console.error('Submission alert email failed:', err)
      })
    }

    return NextResponse.json({ 
      success: true, 
      responseId: response.id 
    })
  } catch (err) {
    console.error('Form submission error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
