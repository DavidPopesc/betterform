import { createFormResponse, buildContractFields, type SubmissionField, type UploadedAttachmentInput } from '@/lib/submission'

export type FinalizeResult =
  | { ok: true; responseId: string }
  | { ok: false; error: string; status: number }

// Verifies a PaymentIntent actually succeeded, then creates the stashed Response —
// idempotently, so it's safe to call this from both the client's return-call after
// `confirmPayment` and, as a safety net, the Stripe webhook (whichever gets there first wins).
export async function finalizePendingSubmission(paymentIntentId: string): Promise<FinalizeResult> {
  const { default: prisma } = await import('@/lib/db')

  const pending = await prisma.pendingSubmission.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: {
      form: {
        select: {
          id: true,
          publicId: true,
          name: true,
          schema: true,
          oneResponsePerEmail: true,
          oneResponsePerUser: true,
          webhookUrl: true,
          submissionApiKey: true,
          notifyOnFormSubmission: true,
          account: { select: { email: true, stripeAccountId: true } },
        },
      },
    },
  })

  if (!pending) {
    return { ok: false, error: 'pending_submission_not_found', status: 404 }
  }

  if (pending.status === 'completed' && pending.responseId) {
    return { ok: true, responseId: pending.responseId }
  }

  const connectedAccountId = pending.form.account?.stripeAccountId
  if (!connectedAccountId) {
    return { ok: false, error: 'stripe_not_connected', status: 400 }
  }

  const { default: stripe } = await import('@/lib/stripe')
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, undefined, {
    stripeAccount: connectedAccountId,
  })

  if (paymentIntent.status !== 'succeeded') {
    return { ok: false, error: 'payment_not_completed', status: 402 }
  }

  const schemaFields = ((pending.form.schema as { fields?: SubmissionField[] } | null)?.fields || [])
  const fileFields = schemaFields.filter((f) => f.type === 'file_upload')
  const isContractForm = schemaFields.some((f) => f.type === 'signature')

  const responses = pending.responses as Record<string, unknown>
  const uploadedAttachmentsByField = (pending.uploadedAttachments || {}) as Record<string, UploadedAttachmentInput[]>
  const deviceMetadata = (pending.deviceMetadata || null) as Record<string, unknown> | null

  const contractFields = buildContractFields({
    isContractForm,
    // Already merged server+client metrics at stash time — nothing further to merge here.
    deviceMetrics: deviceMetadata,
    clientDeviceMetadata: null,
    schemaFields,
  })

  const extraFields = {
    ...contractFields,
    stripePaymentIntentId: paymentIntentId,
    amountPaidCents: paymentIntent.amount_received,
    paymentCurrency: paymentIntent.currency,
    paidAt: new Date(),
  }

  const { response } = await createFormResponse({
    prisma,
    form: { ...pending.form, name: pending.form.name },
    publicId: pending.form.publicId,
    schemaFields,
    fileFields,
    responses,
    respondentEmail: pending.respondentEmail,
    formAccountId: pending.formAccountId,
    ip: pending.respondentIp,
    submissionLocation: (pending.submissionLocation || null) as Record<string, unknown> | null,
    uploadedAttachmentsByField,
    isContractForm,
    extraFields,
  })

  await prisma.pendingSubmission.update({
    where: { id: pending.id },
    data: { status: 'completed', responseId: response.id },
  })

  return { ok: true, responseId: response.id }
}
