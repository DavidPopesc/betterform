import { notFound } from 'next/navigation'

import { Card } from '@/components/ui/card'
import { normalizeValueForMatch, parseFormSchema } from '@/lib/form-schema'

export default async function LimitedPublicResponsesPage({
  params,
}: {
  params: Promise<{ publicId: string; viewId: string }>
}) {
  const { publicId, viewId } = await params
  const { default: prisma } = await import('@/lib/db')

  const form = await prisma.form.findUnique({
    where: { publicId },
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

  if (!form) {
    notFound()
  }

  const schema = parseFormSchema(form.schema)
  const limitedView = schema.limitedPublicViews.find((view) => view.id === viewId)

  if (!limitedView) {
    notFound()
  }

  const visibleFields = schema.fields.filter((field) => limitedView.visibleFieldIds.includes(field.id))
  const getOptionLabel = (fieldId: string, optionId: string) => {
    const field = schema.fields.find((item) => item.id === fieldId)
    const option = field?.options?.find((item) => item.id === optionId)
    return option?.label || optionId
  }
  const filteredResponses = form.responses.filter((response) => {
    const payload = response.response as Record<string, unknown>
    return normalizeValueForMatch(payload[limitedView.filterFieldId]) === normalizeValueForMatch(limitedView.filterValue)
  })

  return (
    <div className="min-h-svh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Card className="mb-6 border border-slate-200 bg-white p-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
              b
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Limited public response view</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{form.name || 'Untitled form'}</h1>
          <p className="mt-2 text-sm text-slate-500">{limitedView.name}</p>
        </Card>

        <Card className="overflow-hidden border border-slate-200 bg-white p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Timestamp</th>
                  {visibleFields.map((field) => (
                    <th key={field.id} className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResponses.length === 0 ? (
                  <tr>
                    <td colSpan={visibleFields.length + 1} className="px-4 py-10 text-center text-sm text-slate-500">
                      No responses matched this public view.
                    </td>
                  </tr>
                ) : (
                  filteredResponses.map((response) => {
                    const payload = response.response as Record<string, unknown>
                    return (
                      <tr key={response.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(response.createdAt).toLocaleString()}</td>
                        {visibleFields.map((field) => {
                          const value = payload[field.id]
                          let displayValue = ''

                          if (value !== undefined && value !== null && value !== '') {
                            if (['multiple_choice', 'dropdown'].includes(field.type)) {
                              displayValue = getOptionLabel(field.id, String(value))
                            } else if (field.type === 'checkboxes' && Array.isArray(value)) {
                              displayValue = value.map((item) => getOptionLabel(field.id, String(item))).join(', ')
                            } else if (field.type === 'file_upload' && Array.isArray(value)) {
                              displayValue = value
                                .map((item) =>
                                  typeof item === 'object' && item !== null && 'filename' in item
                                    ? String((item as { filename: unknown }).filename)
                                    : String(item)
                                )
                                .join(', ')
                            } else if (Array.isArray(value)) {
                              displayValue = value.join(', ')
                            } else {
                              displayValue = String(value)
                            }
                          }
                          return (
                            <td key={field.id} className="px-4 py-3 text-sm text-slate-800">
                              {displayValue}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
