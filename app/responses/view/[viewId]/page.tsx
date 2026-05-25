import Image from 'next/image'
import Link from 'next/link'

import LocalizedDateTime from '@/components/LocalizedDateTime'
import { Card } from '@/components/ui/card'
import { getSharedResponseViewPayload } from '@/lib/public-response-view'

export default async function SharedResponsesPage({
  params,
}: {
  params: Promise<{ viewId: string }>
}) {
  const { viewId } = await params
  const payload = await getSharedResponseViewPayload(viewId)

  const getOptionLabel = (fieldId: string, optionId: string) => {
    const field = payload.schema.fields.find((item) => item.id === fieldId)
    const option = field?.options?.find((item) => item.id === optionId)
    return option?.label || optionId
  }

  return (
    <div className="min-h-svh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Card className="mb-6 border border-slate-200 bg-white p-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {payload.form.name || 'Untitled form'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{payload.sharedView.name}</p>
        </Card>

        <Card className="overflow-hidden border border-slate-200 bg-white p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Timestamp</th>
                  {payload.visibleFields.map((field) => (
                    <th key={field.id} className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payload.filteredResponses.length === 0 ? (
                  <tr>
                    <td colSpan={payload.visibleFields.length + 1} className="px-4 py-10 text-center text-sm text-slate-500">
                      No responses matched this shared view.
                    </td>
                  </tr>
                ) : (
                  payload.filteredResponses.map((response) => {
                    const responsePayload = response.response as Record<string, unknown>
                    return (
                      <tr key={response.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <LocalizedDateTime value={response.createdAt} />
                        </td>
                        {payload.visibleFields.map((field) => {
                          const value = responsePayload[field.id]
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

        <div className="mt-8 flex justify-center opacity-45">
          <Link href="/dashboard" aria-label="Open dashboard">
            <Image src="/betterformlogo.png" alt="Better Form logo" width={28} height={28} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
