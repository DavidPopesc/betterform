import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import type { Prisma } from '@/lib/generated/prisma'
import { isRemoteBlobUrl } from '@/lib/blob'
import { parseSubmissionLocation } from '@/lib/location'
import { getOrCreateFormAccountId, getClientIp, getDeviceMetrics, updateFormAccountTracking } from '@/lib/form-account'
import { validateSubmissionPreconditions, type UploadedAttachmentInput } from '@/lib/submission'

const PENDING_SUBMISSION_LIFETIME_MS = 1000 * 60 * 30 // 30 minutes

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
        webhookUrl: true,
        submissionApiKey: true,
        paymentRequired: true,
        paymentAmountCents: true,
        paymentCurrency: true,
        account: {
          select: {
            email: true,
            stripeAccountId: true,
            stripeAccountOnboarded: true,
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'form_not_found' }, { status: 404 })
    }

    if (!form.paymentRequired) {
      return NextResponse.json({ error: 'payment_not_required' }, { status: 400 })
    }

    if (!form.account?.stripeAccountId || !form.account.stripeAccountOnboarded) {
      return NextResponse.json({ error: 'stripe_not_connected' }, { status: 400 })
    }

    if (!form.paymentAmountCents || form.paymentAmountCents <= 0) {
      return NextResponse.json({ error: 'invalid_payment_amount' }, { status: 400 })
    }

    if (!form.responsesEnabled) {
      return NextResponse.json({
        error: 'form_closed',
        message: 'This form is not accepting responses.',
      }, { status: 403 })
    }

    if (form.responseDeadline && new Date() > new Date(form.responseDeadline)) {
      return NextResponse.json({
        error: 'deadline_passed',
        message: 'The response deadline has passed.',
      }, { status: 403 })
    }

    const body = await req.json()
    const responses = body.responses as Record<string, unknown>
    const submissionLocation = parseSubmissionLocation(body.location)
    uploadedAttachmentsByField =
      typeof body.uploadedAttachments === 'object' && body.uploadedAttachments !== null
        ? body.uploadedAttachments as Record<string, UploadedAttachmentInput[]>
        : {}
    const clientDeviceMetadata =
      typeof body.deviceMetadata === 'object' && body.deviceMetadata !== null ? body.deviceMetadata : null

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

    const formAccountId = await getOrCreateFormAccountId()
    const ip = getClientIp(req.headers)
    const deviceMetrics = getDeviceMetrics(req.headers)

    await updateFormAccountTracking(formAccountId, {
      ip,
      deviceMetrics,
      formViewed: form.id,
    })

    const validation = await validateSubmissionPreconditions({
      form,
      publicId,
      responses,
      uploadedAttachmentsByField,
      isApiRequest: false,
      formAccountId,
      ip,
    })

    if (!validation.ok) {
      return errorJson(
        { error: validation.error.error, message: validation.error.message },
        validation.error.status
      )
    }

    const { respondentEmail } = validation.context

    const { default: stripe } = await import('@/lib/stripe')
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: form.paymentAmountCents,
        currency: form.paymentCurrency,
        automatic_payment_methods: { enabled: true },
        receipt_email: respondentEmail || undefined,
        metadata: { formId: form.id, publicId },
      },
      { stripeAccount: form.account.stripeAccountId }
    )

    if (!paymentIntent.client_secret) {
      throw new Error('Stripe did not return a client secret')
    }

    await prisma.pendingSubmission.create({
      data: {
        formId: form.id,
        stripePaymentIntentId: paymentIntent.id,
        responses: responses as Prisma.InputJsonValue,
        uploadedAttachments: uploadedAttachmentsByField as unknown as Prisma.InputJsonValue,
        submissionLocation: (submissionLocation as Prisma.InputJsonValue | null) || undefined,
        deviceMetadata: { ...(deviceMetrics || {}), ...(clientDeviceMetadata || {}) } as Prisma.InputJsonValue,
        respondentEmail,
        respondentIp: ip,
        formAccountId,
        expiresAt: new Date(Date.now() + PENDING_SUBMISSION_LIFETIME_MS),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      connectedAccountId: form.account.stripeAccountId,
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

    console.error('Payment intent creation error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
