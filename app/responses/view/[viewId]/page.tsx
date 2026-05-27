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

  const renderFileList = (value: unknown) => {
    if (!Array.isArray(value)) return '-'

    const files = value.filter((item): item is { attachmentId?: unknown; filename?: unknown; url?: unknown } =>
      typeof item === 'object' && item !== null
    )

    if (files.length === 0) return '-'

    return (
      <div className="flex flex-col gap-1">
        {files.map((file, index) => {
          const label = typeof file.filename === 'string' && file.filename.trim().length > 0
            ? file.filename
            : `File ${index + 1}`
          const href = typeof file.attachmentId === 'string'
            ? `/api/attachments/${file.attachmentId}?viewId=${encodeURIComponent(viewId)}`
            : typeof file.url === 'string'
              ? `${file.url}${file.url.includes('?') ? '&' : '?'}viewId=${encodeURIComponent(viewId)}`
              : null

          if (!href) {
            return <span key={`${label}-${index}`}>{label}</span>
          }

          return (
            <a
              key={`${href}-${index}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="w-fit text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              {label}
            </a>
          )
        })}
      </div>
    )
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
                            } else if (Array.isArray(value)) {
                              displayValue = value.join(', ')
                            } else {
                              displayValue = String(value)
                            }
                          }

                          return (
                            <td key={field.id} className="px-4 py-3 text-sm text-slate-800">
                              {field.type === 'file_upload' ? renderFileList(value) : displayValue}
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
