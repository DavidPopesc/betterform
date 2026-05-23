import { headers } from 'next/headers'

import { parseFormSchema } from '@/lib/form-schema'

export async function getPublicFormPayload(identifier: string, prefillId?: string) {
  const { default: prisma } = await import('@/lib/db')
  let form = await prisma.form.findUnique({
    where: { publicId: identifier },
    select: {
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
      oneResponsePerUser: true,
    },
  })

  let resolvedPrefillId = prefillId

  if (!form && !prefillId) {
    const candidateForms = await prisma.form.findMany({
      select: {
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
        oneResponsePerUser: true,
      },
    })

    for (const candidate of candidateForms) {
      const schema = parseFormSchema(candidate.schema)
      const matchedPrefill = schema.prefills.find((prefill) => prefill.id === identifier)
      if (matchedPrefill) {
        form = candidate
        resolvedPrefillId = matchedPrefill.id
        break
      }
    }
  }

  if (!form) {
    return null
  }

  const schema = parseFormSchema(form.schema)
  const selectedPrefill = resolvedPrefillId ? schema.prefills.find((prefill) => prefill.id === resolvedPrefillId) : null

  const isClosed = !form.responsesEnabled || (form.responseDeadline ? new Date() > new Date(form.responseDeadline) : false)

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

  if (!form.responsesEnabled) {
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
  }
}
