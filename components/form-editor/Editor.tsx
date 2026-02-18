"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { CirclePlus, Import, CaseSensitive, Image, GalleryVertical } from 'lucide-react'
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
  // ensure the form always has a title field at index 0 which cannot be deleted
  function ensureHasTitle(arr: Field[]) {
    const hasTitle = arr.some((f) => f.type === 'form_title')
    if (hasTitle) return arr
    const titleId = `field_title`
    const titleField: Field = { id: titleId, type: 'form_title', label: initialSchema?.title ?? 'Untitled form', order: 0 }
    return [titleField, ...arr.map((f, i) => ({ ...f, order: i + 1 }))]
  }

  const [selected, setSelected] = React.useState<string | null>(ensureHasTitle(fields)[0]?.id ?? null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setFields(ensureHasTitle(initialSchema.fields ?? []))
    setSelected(ensureHasTitle(initialSchema.fields ?? [])[0]?.id ?? null)
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
    setIsDirty(true)
  }

  function deleteField(id: string) {
    const toDelete = fields.find((f) => f.id === id)
    if (!toDelete) return
    // prevent deleting the form title
    if (toDelete.type === 'form_title') return
    setFields((s) => s.filter((f) => f.id !== id))
    if (selected === id) {
      setSelected(fields.length > 1 ? fields[0].id : null)
    }
    setIsDirty(true)
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    setIsDirty(true)
  }

  function moveField(from: number, to: number) {
    if (to < 0 || to >= fields.length) return
    const updated = [...fields]
    const [removed] = updated.splice(from, 1)
    updated.splice(to, 0, removed)
    setFields(updated)
    setIsDirty(true)
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
      // mark saved
      setIsDirty(false)
      setLastSavedAt(new Date())
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Autosave: debounce saves when fields change and there are unsaved edits
  React.useEffect(() => {
    if (!isDirty) return
    const id = setTimeout(() => {
      void saveForm()
    }, 5000)
    return () => clearTimeout(id)
  }, [fields, isDirty])

  // Try to persist on unload using navigator.sendBeacon as a best-effort
  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return
      try {
        const url = `/api/forms/${formId}/save`
        const payload = JSON.stringify({ schema: { fields } })
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } catch (e) {
        // ignore
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [fields, isDirty, formId])

  const selectedField = fields.find((f) => f.id === selected) ?? null
  const selectedIndex = fields.findIndex((f) => f.id === selected)

  return (
    <div className="max-w-6xl w-full mx-auto px-4 flex flex-col gap-4">
      {/* Top toolbar */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Form Editor</h2>
        <div className="text-sm text-muted-foreground">
          {isSaving
            ? 'Saving…'
            : lastSavedAt
            ? `Saved ${lastSavedAt.toLocaleTimeString()}`
            : isDirty
            ? 'Unsaved changes'
            : 'All changes saved'}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 justify-center items-start">
        {/* Sidebar: Field Types
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
        </aside> */}

        {/* Center: Canvas */}
        <div className="col-span-12">
          <Card className="p-6 w-full max-w-3xl mx-auto">
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
                    className={`relative p-4 border-2 rounded-md cursor-pointer transition-all overflow-visible ${
                      selected === f.id
                        ? 'border-primary bg-primary/5 shadow-sm md:py-6'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelected(f.id)}
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        {f.type === 'form_title' ? (
                          <div>
                            <Input
                              value={f.label}
                              onChange={(e) => updateField(f.id, { label: e.target.value })}
                              placeholder="Form title"
                              className="text-2xl font-semibold"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">
                              {f.type} {f.required && '(required)'}
                            </div>
                            <div className="font-medium mt-1">{f.label}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contextual inspector shown for selected field */}
                    {selected === f.id && (
                      <>
                        <div className="absolute top-1/2 left-full ml-8 -translate-y-1/2 hidden md:block">
                          <Card className="p-2 w-16">
                            <div className="flex flex-col gap-3 items-center">
                              <Button variant="outline" size="icon-sm" className="p-0"> <CirclePlus /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <Import /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <CaseSensitive /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <Image /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <GalleryVertical /> </Button>
                            </div>
                          </Card>
                        </div>

                        <div className="mt-3 md:hidden">
                          <Card className="p-2 w-full">
                            <div className="flex gap-3 items-center justify-center">
                              <Button variant="outline" size="icon-sm" className="p-0"> <CirclePlus /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <Import /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <CaseSensitive /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <Image /> </Button>
                              <Button variant="outline" size="icon-sm" className="p-0"> <GalleryVertical /> </Button>
                            </div>
                          </Card>
                        </div>
                      </>
                    )}

                    {selected === f.id && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="text-muted-foreground">Field</div>
                        <div className="flex items-center gap-2">
                          <Button size="xs" variant="ghost" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveField(idx, idx - 1) }}>↑</Button>
                          <Button size="xs" variant="ghost" disabled={idx === fields.length - 1} onClick={(e) => { e.stopPropagation(); moveField(idx, idx + 1) }}>↓</Button>
                          <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); updateField(f.id, { required: !f.required }) }}>
                            {f.required ? 'Required' : 'Optional'}
                          </Button>
                          <Button size="xs" variant="destructive" onClick={(e) => { e.stopPropagation(); deleteField(f.id) }} disabled={f.type === 'form_title'}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  )
}
