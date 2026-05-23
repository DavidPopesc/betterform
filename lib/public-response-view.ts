import { notFound } from 'next/navigation'

import { normalizeValueForMatch, parseFormSchema } from '@/lib/form-schema'

export async function getSharedResponseViewPayload(viewId: string) {
  const { default: prisma } = await import('@/lib/db')
  const forms = await prisma.form.findMany({
    select: {
      id: true,
      name: true,
      schema: true,
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
