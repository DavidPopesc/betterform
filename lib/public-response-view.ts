import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { getClientIp } from '@/lib/form-account'
import { normalizeValueForMatch, parseFormSchema } from '@/lib/form-schema'
import { sendLimitedPublicViewVisitAlert } from '@/lib/email'

async function logSharedResponseViewVisit(params: {
  formId: string
  formName: string
  notifyOnLimitedViewVisit: boolean
  ownerEmail: string | null
  viewId: string
  viewName: string
}) {
  const headersList = await headers()
  const ip = getClientIp(headersList)
  const userAgent = headersList.get('user-agent')
  const viewedAt = new Date()
  const { default: prisma } = await import('@/lib/db')

  await prisma.limitedPublicViewVisit.create({
    data: {
      formId: params.formId,
      viewId: params.viewId,
      viewName: params.viewName,
      ip,
      userAgent,
      createdAt: viewedAt,
    },
  })

  if (params.notifyOnLimitedViewVisit && params.ownerEmail) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    sendLimitedPublicViewVisitAlert({
      to: params.ownerEmail,
      formName: params.formName || 'Untitled form',
      viewName: params.viewName,
      viewUrl: `${appUrl}/responses/view/${params.viewId}`,
      viewedAt,
    }).catch((error) => {
      console.error('Shared response view alert email failed:', error)
    })
  }
}

export async function getSharedResponseViewPayload(viewId: string) {
  const { default: prisma } = await import('@/lib/db')
  const forms = await prisma.form.findMany({
    select: {
      id: true,
      name: true,
      schema: true,
      notifyOnLimitedViewVisit: true,
      account: {
        select: {
          email: true,
        },
      },
      responses: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          response: true,
        },
      },
    },
  })

  for (const form of forms) {
    const schema = parseFormSchema(form.schema)
    const sharedView = schema.limitedPublicViews.find((view) => view.id === viewId)
    if (!sharedView) continue

    const visibleFields = schema.fields.filter((field) => sharedView.visibleFieldIds.includes(field.id))
    const filteredResponses = form.responses.filter((response) => {
      const payload = response.response as Record<string, unknown>
      return normalizeValueForMatch(payload[sharedView.filterFieldId]) === normalizeValueForMatch(sharedView.filterValue)
    })

    await logSharedResponseViewVisit({
      formId: form.id,
      formName: form.name || 'Untitled form',
      notifyOnLimitedViewVisit: form.notifyOnLimitedViewVisit,
      ownerEmail: form.account.email,
      viewId: sharedView.id,
      viewName: sharedView.name,
    })

    return {
      form,
      sharedView,
      schema,
      visibleFields,
      filteredResponses,
    }
  }

  notFound()
}
