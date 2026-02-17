"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Field = {
  id: string
  type: string
  label: string
  required?: boolean
  order?: number
}

interface EditorProps {
  formId: string
  initialSchema: any
}

export default function Editor({ formId, initialSchema }: EditorProps) {
  const [fields, setFields] = React.useState<Field[]>(initialSchema.fields ?? [])
  const [selected, setSelected] = React.useState<string | null>(fields[0]?.id ?? null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setFields(initialSchema.fields ?? [])
    setSelected((initialSchema.fields?.[0]?.id) ?? null)
  }, [initialSchema])

  function addField(type: string) {
    const id = `field_${Math.random().toString(36).slice(2, 9)}`
    const f: Field = {
      id,
      type,
      label: `New ${type.replace(/_/g, ' ')}`,
      order: fields.length,
    }
    setFields((s) => [...s, f])
    setSelected(id)
  }

  function deleteField(id: string) {
    setFields((s) => s.filter((f) => f.id !== id))
    if (selected === id) {
      setSelected(fields.length > 1 ? fields[0].id : null)
    }
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function moveField(from: number, to: number) {
    if (to < 0 || to >= fields.length) return
    const updated = [...fields]
    const [removed] = updated.splice(from, 1)
    updated.splice(to, 0, removed)
    setFields(updated)
  }

  async function saveForm() {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: { fields } }),
      })
      if (!res.ok) throw new Error('save-failed')
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedField = fields.find((f) => f.id === selected) ?? null
  const selectedIndex = fields.findIndex((f) => f.id === selected)

  return (
    <div className="flex flex-col gap-4">
      {/* Top toolbar */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Form Editor</h2>
        <Button onClick={saveForm} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar: Field Types */}
        <aside className="col-span-3">
          <Card className="p-4">
            <div className="font-semibold mb-4">Add a field</div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={() => addField('short_text')}>
                Short text
              </Button>
              <Button size="sm" variant="outline" onClick={() => addField('paragraph')}>
                Paragraph
              </Button>
              <Button size="sm" variant="outline" onClick={() => addField('multiple_choice')}>
                Multiple choice
              </Button>
              <Button size="sm" variant="outline" onClick={() => addField('checkboxes')}>
                Checkboxes
              </Button>
              <Button size="sm" variant="outline" onClick={() => addField('dropdown')}>
                Dropdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => addField('date')}>
                Date
              </Button>
            </div>
          </Card>
        </aside>

        {/* Center: Canvas */}
        <section className="col-span-6">
          <Card className="p-6">
            <div className="font-semibold mb-4">Form preview</div>
            {fields.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No fields yet — add one from the left to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <div
                    key={f.id}
                    className={`p-4 border-2 rounded-md cursor-pointer transition-colors ${
                      selected === f.id
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelected(f.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          {f.type} {f.required && '(required)'}
                        </div>
                        <div className="font-medium mt-1">{f.label}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveField(idx, idx - 1)
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={idx === fields.length - 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveField(idx, idx + 1)
                          }}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Right sidebar: Inspector */}
        <aside className="col-span-3">
          <Card className="p-4">
            <div className="font-semibold mb-4">Field properties</div>
            {selectedField ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Label</label>
                  <Input
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    placeholder="Field label"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selectedField.required}
                      onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Type: {selectedField.type}
                  </label>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteField(selectedField.id)}
                  className="w-full mt-4"
                >
                  Delete field
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Select a field to edit its properties.
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
