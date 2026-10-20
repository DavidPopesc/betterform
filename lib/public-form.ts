import { headers } from 'next/headers'

import { parseFormSchema } from '@/lib/form-schema'
import { EXPIRED_LINK_MESSAGE, isLinkExpired, linkHiddenFieldIds, linkValues } from '@/lib/form-links'
import type { FormLink } from '@/lib/generated/prisma'

const PUBLIC_FORM_SELECT = {
  id: true,
  publicId: true,
  name: true,
  schema: true,
  theme: true,
  isQuiz: true,
  showScore: true,
  responsesEnabled: true,
  responseDeadline: true,
  successMessage: true,
  allowAnotherResponse: true,
  oneResponsePerUser: true,
  requireLocationOnSubmit: true,
  geoLockEnabled: true,
  geoLockLatitude: true,
  geoLockLongitude: true,
  geoLockRadiusMeters: true,
  paymentRequired: true,
  paymentAmountCents: true,
  paymentCurrency: true,
} as const

/**
 * Loads a form for /f/{identifier}. The identifier is either the form's publicId or the id of
 * one of its unique links (see lib/form-links.ts); `linkId` is used by the legacy /f/{publicId}/p/{linkId} route.
 */
export async function getPublicFormPayload(identifier: string, linkId?: string) {
  const { default: prisma } = await import('@/lib/db')

  let form = linkId ? null : await prisma.form.findUnique({ where: { publicId: identifier }, select: PUBLIC_FORM_SELECT })
  let link: FormLink | null = null

  if (!form) {
    const found = await prisma.formLink.findUnique({
      where: { id: linkId ?? identifier },
      include: { form: { select: PUBLIC_FORM_SELECT } },
    })
    if (found && (!linkId || found.form.publicId === identifier)) {
      const { form: linkedForm, ...rest } = found
      form = linkedForm
      link = rest
    }
  }

  if (!form) {
    return null
  }

  const schema = parseFormSchema(form.schema)
  const linkExpired = link ? isLinkExpired(link) : false
  const selectedPrefill = link
    ? { id: link.id, name: link.label, values: linkValues(link), hiddenFieldIds: linkHiddenFieldIds(link) }
    : null

  const isClosed =
    linkExpired || !form.responsesEnabled || (form.responseDeadline ? new Date() > new Date(form.responseDeadline) : false)

  let alreadySubmitted = false
  let closedReason = 'This form is not accepting responses.'
  const { getFormAccountId } = await import('@/lib/form-account')
  const formAccountId = await getFormAccountId()

  if (!isClosed && form.oneResponsePerUser && formAccountId) {
    const { hasFormAccountSubmitted } = await import('@/lib/form-account')
    alreadySubmitted = await hasFormAccountSubmitted(formAccountId, form.id)

    if (alreadySubmitted) {
      closedReason = 'You have already submitted a response to this form.'
    }
  }

  if (!isClosed && !alreadySubmitted && formAccountId) {
    const { updateFormAccountTracking, getClientIp, getDeviceMetrics } = await import('@/lib/form-account')
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const deviceMetrics = getDeviceMetrics(headersList)

    await updateFormAccountTracking(formAccountId, {
      ip,
      deviceMetrics,
      formViewed: form.id,
    }).catch(() => {})
  }

  const finalClosed = isClosed || alreadySubmitted

  if (linkExpired) {
    closedReason = EXPIRED_LINK_MESSAGE
  } else if (!form.responsesEnabled) {
    closedReason = 'This form is not accepting responses.'
  } else if (form.responseDeadline && new Date() > new Date(form.responseDeadline)) {
    closedReason = 'The response deadline has passed. This form is no longer accepting submissions.'
  }

  const fields = finalClosed ? [] : schema.fields

  return {
    form,
    publicId: form.publicId,
    fields,
    theme: form.theme ?? 'slate',
    closedReason,
    isClosed: finalClosed,
    prefill: selectedPrefill,
    locationSettings: {
      requireLocationOnSubmit: form.requireLocationOnSubmit ?? false,
      geoLockEnabled: form.geoLockEnabled ?? false,
      geoLockLatitude: form.geoLockLatitude ?? null,
      geoLockLongitude: form.geoLockLongitude ?? null,
      geoLockRadiusMeters: form.geoLockRadiusMeters ?? null,
    },
    paymentSettings: {
      paymentRequired: form.paymentRequired ?? false,
      paymentAmountCents: form.paymentAmountCents ?? null,
      paymentCurrency: form.paymentCurrency ?? 'usd',
    },
    allowAnotherResponse: form.allowAnotherResponse ?? false,
  }
}
