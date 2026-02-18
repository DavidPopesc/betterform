"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { CirclePlus, Import, CaseSensitive, Image, GalleryVertical } from 'lucide-react'
import InspectorButtons from './InspectorButtons'
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
  // form name (stored in DB `name`), and fields (schema) stored separately
  const [formName, setFormName] = React.useState<string>(initialSchema?.name ?? initialSchema?.title ?? 'Untitled form')
  const [selected, setSelected] = React.useState<string | null>(fields[0]?.id ?? null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)

  React.useEffect(() => {
    // load fields but strip any legacy `form_title` entries from stored schema
    const loaded = (initialSchema.fields ?? []).filter((f: Field) => f.type !== 'form_title')
    setFields(loaded.map((f: Field, i: number) => ({ ...f, order: i })))
    setFormName(initialSchema?.name ?? initialSchema?.name ?? 'Untitled form')
    setSelected((loaded[0]?.id) ?? null)
  }, [initialSchema])

  function addField(type: string) {
    const id = `field_${Math.random().toString(36).slice(2, 9)}`
    const f: Field = { id, type, label: `New ${type.replace(/_/g, ' ')}` }
    setFields((s) => {
      // insert after selected field; if nothing selected, append at end
      const found = s.findIndex((x) => x.id === selected)
      const insertAt = found === -1 ? s.length : found + 1
      const next = [...s]
      next.splice(insertAt, 0, { ...f })
      // recompute orders
      const withOrder = next.map((it, i) => ({ ...it, order: i }))
      return withOrder
    })
    setSelected(id)
    setIsDirty(true)
  }

  function deleteField(id: string) {
    const toDelete = fields.find((f) => f.id === id)
    if (!toDelete) return
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
        body: JSON.stringify({ name: formName, schema: { fields } }),
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
  }, [fields, isDirty, formName])

  // Try to persist on unload using navigator.sendBeacon as a best-effort
  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return
      try {
        const url = `/api/forms/${formId}/save`
        const payload = JSON.stringify({ name: formName, schema: { fields } })
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } catch (e) {
        // ignore
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [fields, isDirty, formId, formName])

  const selectedField = fields.find((f) => f.id === selected) ?? null
  const selectedIndex = fields.findIndex((f) => f.id === selected)
  const inspectorRef = React.useRef<HTMLDivElement | null>(null)
  const [inspectorPos, setInspectorPos] = React.useState<{ top: number; left: number; visible: boolean }>({ top: 0, left: 0, visible: false })

  React.useEffect(() => {
    function updatePos() {
      if (!selected) {
        setInspectorPos((s) => ({ ...s, visible: false }))
        return
      }
      const fieldEl = document.getElementById(`field-${selected}`)
      const inspectorEl = inspectorRef.current
      if (!fieldEl || !inspectorEl) {
        setInspectorPos((s) => ({ ...s, visible: false }))
        return
      }
      const fieldRect = fieldEl.getBoundingClientRect()
      const inspRect = inspectorEl.getBoundingClientRect()
      const margin = 12
      // prefer right side
      let left = fieldRect.right + margin
      let top = fieldRect.top + window.scrollY + fieldRect.height / 2 - inspRect.height / 2
      // if it overflows right edge, place on left
      if (left + inspRect.width > window.innerWidth - margin) {
        left = Math.max(margin, fieldRect.left - margin - inspRect.width)
      }
      // clamp vertically
      const minTop = window.scrollY + margin
      const maxTop = window.scrollY + window.innerHeight - inspRect.height - margin
      top = Math.min(Math.max(top, minTop), maxTop)
      setInspectorPos({ top, left, visible: true })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos)
    }
  }, [selected, fields])

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

        {/* Center: Canvas */}
        <div className="col-span-12">
          <Card className="p-6 w-full max-w-3xl mx-auto">
            <div className="font-semibold mb-4">Form preview</div>

            <div className="mb-4">
              <Input
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="Form title"
                className="text-2xl font-semibold"
              />
            </div>

            {fields.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No fields yet — add one to get started.
                <InspectorButtons onAdd={addField} className="justify-center mt-4" />
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <React.Fragment key={f.id}>
                  <div id={`field-${f.id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const from = Number(e.dataTransfer.getData('text/plain'))
                      const to = idx
                      if (Number.isNaN(from)) return
                      if (from === to) return
                      setFields((s) => {
                        const next = [...s]
                        const [moved] = next.splice(from, 1)
                        let insertAt = to
                        if (from < to) insertAt = to
                        next.splice(insertAt, 0, moved)
                        const withOrder = next.map((it, i) => ({ ...it, order: i }))
                        // select moved field
                        setSelected(moved.id)
                        return withOrder
                      })
                    }}
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

                  {/* mobile: render horizontal adder outside the question, between this and the next */}
                  {selected === f.id && (
                    <div className="mt-3 md:hidden">
                      <Card className="p-2 w-full">
                        <InspectorButtons onAdd={addField} />
                      </Card>
                    </div>
                  )}

                  </React.Fragment>
                ))}
              </div>
            )}
          </Card>
        </div>

      {/** Fixed-position desktop inspector so it never gets clipped by container */}
      {selected && (
        <div
          ref={inspectorRef}
          className="hidden md:block"
          style={{ position: 'fixed', top: inspectorPos.top, left: inspectorPos.left, zIndex: 60 }}
        >
          <Card className="p-2 w-16">
            <InspectorButtons onAdd={addField} vertical />
          </Card>
        </div>
      )}

      </div>
    </div>
  )
}
