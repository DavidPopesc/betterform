import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { isRemoteBlobUrl } from '@/lib/blob'
import { distanceBetweenMeters, parseSubmissionLocation } from '@/lib/location'
import {
  getOrCreateFormAccountId,
  getClientIp,
  getDeviceMetrics,
  updateFormAccountTracking,
} from '@/lib/form-account'
import { validateSubmissionPreconditions, buildContractFields, createFormResponse, type UploadedAttachmentInput } from '@/lib/submission'
import { finalizePendingSubmission } from '@/lib/pending-submission'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId?: string }> }
) {
  let uploadedAttachmentsByField: Record<string, UploadedAttachmentInput[]> = {}

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
        requireLocationOnSubmit: true,
        geoLockEnabled: true,
        geoLockLatitude: true,
        geoLockLongitude: true,
        geoLockRadiusMeters: true,
        notifyOnFormSubmission: true,
        apiEnabled: true,
        submissionApiKey: true,
        webhookUrl: true,
        paymentRequired: true,
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

    const contentType = req.headers.get('content-type') || ''

    // A respondent returning from the embedded payment step finalizes here instead of
    // resubmitting their answers — the payload was already stashed server-side before
    // the PaymentIntent was created (see /payment-intent), so all we need is the id.
    if (contentType.includes('application/json')) {
      const peekedBody = await req.clone().json().catch(() => null)
      if (peekedBody?.paymentIntentId && typeof peekedBody.paymentIntentId === 'string') {
        const result = await finalizePendingSubmission(peekedBody.paymentIntentId)
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: result.status })
        }
        return NextResponse.json({ success: true, responseId: result.responseId })
      }
    }

    if (form.paymentRequired) {
      return NextResponse.json({
        error: 'payment_required',
        message: 'This form requires payment — use the payment step before submitting.',
      }, { status: 402 })
    }

    let responses: Record<string, unknown>
    let submissionLocation: ReturnType<typeof parseSubmissionLocation> = null
    let clientDeviceMetadata: Record<string, unknown> | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const rawResponses = formData.get('responses')

      if (typeof rawResponses !== 'string') {
        return NextResponse.json({ error: 'invalid_response_data' }, { status: 400 })
      }

      responses = JSON.parse(rawResponses) as Record<string, unknown>
      submissionLocation = parseSubmissionLocation(
        typeof formData.get('location') === 'string' ? JSON.parse(String(formData.get('location'))) : null
      )
      uploadedAttachmentsByField = typeof formData.get('uploadedAttachments') === 'string'
        ? JSON.parse(String(formData.get('uploadedAttachments'))) as Record<string, UploadedAttachmentInput[]>
        : {}
      clientDeviceMetadata = typeof formData.get('deviceMetadata') === 'string'
        ? JSON.parse(String(formData.get('deviceMetadata')))
        : null
    } else {
      const body = await req.json()
      responses = body.responses as Record<string, unknown>
      submissionLocation = parseSubmissionLocation(body.location)
      uploadedAttachmentsByField =
        typeof body.uploadedAttachments === 'object' && body.uploadedAttachments !== null
          ? body.uploadedAttachments as Record<string, UploadedAttachmentInput[]>
          : {}
      clientDeviceMetadata =
        typeof body.deviceMetadata === 'object' && body.deviceMetadata !== null ? body.deviceMetadata : null
    }

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'invalid_response_data' }, { status: 400 })
    }

    const uploadedBlobUrls = Object.values(uploadedAttachmentsByField)
      .flat()
      .map((item) => item.url)
      .filter(isRemoteBlobUrl)

    const errorJson = async (payload: Record<string, unknown>, status: number) => {
      if (uploadedBlobUrls.length > 0) {
        try {
          await del(uploadedBlobUrls)
        } catch (cleanupError) {
          console.error('Blob cleanup failed:', cleanupError)
        }
      }

      return NextResponse.json(payload, { status })
    }

    const locationRequired = form.requireLocationOnSubmit || form.geoLockEnabled
    if (locationRequired && !submissionLocation) {
      return errorJson({
        error: 'location_required',
        message: 'Location access is required before submitting this form.',
      }, 403)
    }

    if (
      form.geoLockEnabled &&
      submissionLocation &&
      form.geoLockLatitude !== null &&
      form.geoLockLongitude !== null &&
      form.geoLockRadiusMeters !== null
    ) {
      const distanceMeters = distanceBetweenMeters(
        submissionLocation.latitude,
        submissionLocation.longitude,
        form.geoLockLatitude,
        form.geoLockLongitude
      )

      if (distanceMeters > form.geoLockRadiusMeters) {
        return errorJson({
          error: 'geo_lock_failed',
          message: `You must be within ${form.geoLockRadiusMeters} meters of the required location to submit this form.`,
        }, 403)
      }
    }

    // For API requests, skip form account tracking
    let formAccountId = null
    let ip = null
    let deviceMetrics: Record<string, unknown> | null = null

    if (!isApiRequest) {
      formAccountId = await getOrCreateFormAccountId()
      ip = getClientIp(req.headers)
      deviceMetrics = getDeviceMetrics(req.headers)

      await updateFormAccountTracking(formAccountId, {
        ip,
        deviceMetrics,
        formViewed: form.id,
      })
    }

    const validation = await validateSubmissionPreconditions({
      form,
      publicId,
      responses,
      uploadedAttachmentsByField,
      isApiRequest,
      formAccountId,
      ip,
    })

    if (!validation.ok) {
      return errorJson(
        { error: validation.error.error, message: validation.error.message },
        validation.error.status
      )
    }

    const { respondentEmail, isContractForm, fileFields, schemaFields } = validation.context

    const contractFields = buildContractFields({
      isContractForm,
      deviceMetrics,
      clientDeviceMetadata,
      schemaFields,
    })

    const { response } = await createFormResponse({
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
      extraFields: contractFields,
    })

    // Track submission in form account (for non-API requests)
    if (!isApiRequest && formAccountId) {
      await updateFormAccountTracking(formAccountId, {
        formSubmitted: form.id,
      })
    }

    return NextResponse.json({
      success: true,
      responseId: response.id
    })
  } catch (err) {
    const uploadedBlobUrls = Object.values(uploadedAttachmentsByField)
      .flat()
      .map((item) => item.url)
      .filter(isRemoteBlobUrl)

    if (uploadedBlobUrls.length > 0) {
      try {
        await del(uploadedBlobUrls)
      } catch (cleanupError) {
        console.error('Blob cleanup failed:', cleanupError)
      }
    }

    console.error('Form submission error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
