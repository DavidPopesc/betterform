"use client"

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatLocationSummary, type SubmissionLocation } from '@/lib/location'
import { Download, Pencil, Save, Trash2, X } from 'lucide-react'

type ResponseData = {
  id: string
  response: Record<string, unknown>
  createdAt: string
  respondentIp?: string
  submissionLocation?: SubmissionLocation | null
}

type Field = {
  id: string
  type: string
  label: string
  options?: Array<{ id: string; label: string }>
}

interface ResponsesTabProps {
  formId: string
  fields: Field[]
}

type SubTab = 'summary' | 'table' | 'individual'

export default function ResponsesTab({ formId, fields }: ResponsesTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('summary')
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [draftResponse, setDraftResponse] = useState<Record<string, unknown>>({})
  const [savingResponseId, setSavingResponseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const loadResponses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/forms/${formId}/responses`)
      if (res.ok) {
        const data = await res.json()
        setResponses(data.responses || [])
      }
    } catch (err) {
      console.error('Failed to load responses:', err)
    } finally {
      setLoading(false)
    }
  }, [formId])

  useEffect(() => {
    void loadResponses()
  }, [loadResponses])

  async function exportCSV() {
    try {
      const res = await fetch(`/api/forms/${formId}/export`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `responses-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const getOptionLabel = (fieldId: string, optionId: string) => {
    const field = fields.find((item) => item.id === fieldId)
    const option = field?.options?.find((item) => item.id === optionId)
    return option?.label || optionId
  }

  const formatResponseValue = (field: Field, value: unknown) => {
    if (value === undefined || value === null || value === '') return '-'

    if (['multiple_choice', 'dropdown'].includes(field.type)) {
      return getOptionLabel(field.id, String(value))
    }

    if (field.type === 'checkboxes' && Array.isArray(value)) {
      return value.map((item) => getOptionLabel(field.id, String(item))).join(', ')
    }

    if (field.type === 'file_upload' && Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === 'object' && item !== null && 'filename' in item
            ? String((item as { filename: unknown }).filename)
            : String(item)
        )
        .join(', ')
    }

    return String(value)
  }

  async function deleteResponse(responseId: string) {
    const confirmed = window.confirm('Delete this response permanently?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/forms/${formId}/responses/${responseId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('failed')
      await loadResponses()
    } catch (err) {
      console.error('Failed to delete response:', err)
    }
  }

  function beginEditing(response: ResponseData) {
    setEditingResponseId(response.id)
    setDraftResponse(JSON.parse(JSON.stringify(response.response)) as Record<string, unknown>)
  }

  function cancelEditing() {
    setEditingResponseId(null)
    setDraftResponse({})
  }

  function updateDraftField(fieldId: string, value: unknown) {
    setDraftResponse((current) => ({ ...current, [fieldId]: value }))
  }

  async function saveResponse(responseId: string) {
    setSavingResponseId(responseId)
    try {
      const res = await fetch(`/api/forms/${formId}/responses/${responseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: draftResponse }),
      })

      if (!res.ok) throw new Error('failed')

      const data = await res.json()
      setResponses((current) =>
        current.map((response) =>
          response.id === responseId ? { ...response, response: data.response.response } : response
        )
      )
      cancelEditing()
    } catch (err) {
      console.error('Failed to update response:', err)
    } finally {
      setSavingResponseId(null)
    }
  }

  function renderEditableField(field: Field, response: ResponseData) {
    const value = draftResponse[field.id]

    if (field.type === 'file_upload') {
      return <div className="text-base">{formatResponseValue(field, response.response[field.id])}</div>
    }

    if (['multiple_choice', 'dropdown'].includes(field.type)) {
      return (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => updateDraftField(field.id, e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select an option</option>
          {field.options?.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'checkboxes') {
      const selectedValues = Array.isArray(value) ? value.map(String) : []
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedValues.includes(option.id)}
                onChange={(e) => {
                  const nextValues = e.target.checked
                    ? [...selectedValues, option.id]
                    : selectedValues.filter((item) => item !== option.id)
                  updateDraftField(field.id, nextValues)
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )
    }

    if (field.type === 'paragraph') {
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => updateDraftField(field.id, e.target.value)}
          className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )
    }

    if (['scale', 'rating', 'linear_scale'].includes(field.type)) {
      return (
        <input
          type="number"
          value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
          onChange={(e) => updateDraftField(field.id, e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )
    }

    if (field.type === 'date') {
      return (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => updateDraftField(field.id, e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )
    }

    if (field.type === 'time') {
      return (
        <input
          type="time"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => updateDraftField(field.id, e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )
    }

    return (
      <input
        type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onChange={(e) => updateDraftField(field.id, e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    )
  }

  const renderSummary = () => {
    if (responses.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No responses yet</h3>
          <p className="text-muted-foreground">
            Responses will appear here once people start filling out your form
          </p>
        </div>
      )
    }

    const stats = fields
      .filter((field) => field.type !== 'text' && field.type !== 'section')
      .map((field) => {
        const responseValues = responses
          .map((response) => response.response[field.id])
          .filter((value) => value !== undefined && value !== null && value !== '')

        const responseCount = responseValues.length
        const responseRate = responses.length > 0 ? ((responseCount / responses.length) * 100).toFixed(1) : '0'
        const distribution: Record<string, number> = {}

        if (['multiple_choice', 'dropdown'].includes(field.type)) {
          responseValues.forEach((value) => {
            const label = getOptionLabel(field.id, String(value))
            distribution[label] = (distribution[label] || 0) + 1
          })
        } else if (field.type === 'checkboxes') {
          responseValues.forEach((value) => {
            if (Array.isArray(value)) {
              value.forEach((item) => {
                const label = getOptionLabel(field.id, String(item))
                distribution[label] = (distribution[label] || 0) + 1
              })
            }
          })
        } else if (['linear_scale', 'rating', 'scale'].includes(field.type)) {
          responseValues.forEach((value) => {
            const key = String(value)
            distribution[key] = (distribution[key] || 0) + 1
          })
        }

        return { field, responseCount, responseRate, distribution }
      })

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{responses.length}</div>
            <div className="text-sm text-muted-foreground">Total responses</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">
              {fields.filter((field) => field.type !== 'text' && field.type !== 'section').length}
            </div>
            <div className="text-sm text-muted-foreground">Questions</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">
              {responses.length > 0 ? new Date(responses[responses.length - 1].createdAt).toLocaleDateString() : '-'}
            </div>
            <div className="text-sm text-muted-foreground">Last response</div>
          </Card>
        </div>

        <div className="space-y-4">
          {stats.map(({ field, responseCount, responseRate, distribution }) => (
            <Card key={field.id} className="p-6">
              <h3 className="font-semibold mb-2">{field.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {responseCount} responses ({responseRate}%)
              </p>

              {Object.keys(distribution).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(distribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([label, count]) => {
                      const percentage = ((count / responseCount) * 100).toFixed(1)
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{label}</span>
                            <span className="text-muted-foreground">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderTable = () => {
    if (responses.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No responses to display</p>
        </div>
      )
    }

    const questionFields = fields.filter((field) => field.type !== 'text' && field.type !== 'section')
    const hasLocationData = responses.some((response) => response.submissionLocation)

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="bg-slate-50 p-3 text-left text-sm font-semibold">Timestamp</th>
              {hasLocationData ? (
                <th className="bg-slate-50 p-3 text-left text-sm font-semibold">Location</th>
              ) : null}
              {questionFields.map((field) => (
                <th key={field.id} className="bg-slate-50 p-3 text-left text-sm font-semibold">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responses.map((response) => (
              <tr key={response.id} className="border-b hover:bg-slate-50">
                <td className="p-3 text-sm">{new Date(response.createdAt).toLocaleString()}</td>
                {hasLocationData ? (
                  <td className="p-3 text-sm">
                    {formatLocationSummary(response.submissionLocation)}
                  </td>
                ) : null}
                {questionFields.map((field) => (
                  <td key={field.id} className="p-3 text-sm">
                    {formatResponseValue(field, response.response[field.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderIndividual = () => {
    if (responses.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No responses to display</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {responses.map((response, index) => (
          <Card key={response.id} className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Response #{responses.length - index}</h3>
                <span className="text-sm text-muted-foreground">
                  {new Date(response.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                {editingResponseId === response.id ? (
                  <>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={() => saveResponse(response.id)} disabled={savingResponseId === response.id}>
                      <Save className="w-4 h-4 mr-2" />
                      {savingResponseId === response.id ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => beginEditing(response)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                <Button variant="outline" onClick={() => deleteResponse(response.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {response.submissionLocation ? (
                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Location</div>
                  <div className="text-base">{formatLocationSummary(response.submissionLocation)}</div>
                  <div className="text-sm text-muted-foreground">
                    Captured {new Date(response.submissionLocation.capturedAt).toLocaleString()}
                  </div>
                </div>
              ) : null}
              {fields
                .filter((field) => field.type !== 'text' && field.type !== 'section')
                .map((field) => (
                  <div key={field.id}>
                    <div className="mb-1 text-sm font-medium text-muted-foreground">{field.label}</div>
                    {editingResponseId === response.id
                      ? renderEditableField(field, response)
                      : <div className="text-base">{formatResponseValue(field, response.response[field.id])}</div>}
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button variant={activeSubTab === 'summary' ? 'default' : 'outline'} onClick={() => setActiveSubTab('summary')}>
            Summary
          </Button>
          <Button variant={activeSubTab === 'table' ? 'default' : 'outline'} onClick={() => setActiveSubTab('table')}>
            Table
          </Button>
          <Button variant={activeSubTab === 'individual' ? 'default' : 'outline'} onClick={() => setActiveSubTab('individual')}>
            Individual
          </Button>
        </div>
        <Button onClick={exportCSV} variant="outline" disabled={responses.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading responses...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'summary' && renderSummary()}
          {activeSubTab === 'table' && renderTable()}
          {activeSubTab === 'individual' && renderIndividual()}
        </>
      )}
    </div>
  )
}
