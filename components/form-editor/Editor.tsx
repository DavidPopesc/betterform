"use client"

import * as React from 'react'
import TopBar, { type Tab } from './TopBar'
import ResponsesTab from './tabs/ResponsesTab'
import SendTab from './tabs/SendTab'
import SettingsTab from './tabs/SettingsTab'
import { ImportModal } from './ImportModal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trash2, Copy, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import InspectorButtons from './InspectorButtons'

export type FieldOption = {
  id: string
  label: string
}

export type Field = {
  id: string
  type: string
  label: string
  description?: string
  required?: boolean
  order?: number
  options?: FieldOption[]
}

export const FIELD_TYPES = [
  { value: 'short_text', label: 'Short answer' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'linear_scale', label: 'Linear scale' },
  { value: 'rating', label: 'Rating' },
  { value: 'text', label: 'Text' },
  { value: 'section', label: 'Section' },
] as const

export function getDefaultLabel(type: string): string {
  const fieldType = FIELD_TYPES.find(ft => ft.value === type)
  if (type === 'text') return 'Description text'
  if (type === 'section') return 'Section break'
  if (type === 'email') return 'Email address'
  if (type === 'phone') return 'Phone number'
  return fieldType ? `${fieldType.label} question` : ''
}

interface EditorProps {
  formId: string
  publicId: string
  initialSchema: { fields?: unknown[]; name?: string; title?: string }
  initialTheme?: string
}

const THEME_COLORS: Record<string, { bg: string; border: string; input: string; button: string; text: string }> = {
    slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    input: 'focus:ring-slate-500',
    button: 'bg-slate-600 hover:bg-slate-700',
    text: 'text-slate-900',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    input: 'focus:ring-blue-500',
    button: 'bg-blue-500 hover:bg-blue-600',
    text: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    input: 'focus:ring-green-500',
    button: 'bg-green-500 hover:bg-green-600',
    text: 'text-green-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    input: 'focus:ring-purple-500',
    button: 'bg-purple-500 hover:bg-purple-600',
    text: 'text-purple-900',
  },
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    input: 'focus:ring-pink-500',
    button: 'bg-pink-500 hover:bg-pink-600',
    text: 'text-pink-900',
  },

}

export default function Editor({ formId, publicId, initialSchema, initialTheme = 'slate' }: EditorProps) {
  const [theme, setTheme] = React.useState(initialTheme)
  const themeColors = THEME_COLORS[theme] || THEME_COLORS.slate
  const [activeTab, setActiveTab] = React.useState<Tab>('questions')
  const [fields, setFields] = React.useState<Field[]>((initialSchema.fields as Field[]) ?? [])
  // form name (stored in DB `name`), and fields (schema) stored separately
  const [formName, setFormName] = React.useState<string>(initialSchema?.name ?? initialSchema?.title ?? 'Untitled form')
  const [selected, setSelected] = React.useState<string | null>(fields[0]?.id ?? null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dropTarget, setDropTarget] = React.useState<number | null>(null)
  const [showImportModal, setShowImportModal] = React.useState(false)

  React.useEffect(() => {
    // load fields but strip any legacy `form_title` entries from stored schema
    const loaded = ((initialSchema.fields ?? []) as Field[]).filter((f) => f.type !== 'form_title')
    setFields(loaded.map((f, i) => ({ ...f, order: i })))
    setFormName(initialSchema?.name ?? 'Untitled form')
    setSelected((loaded[0]?.id) ?? null)
  }, [initialSchema])

  function addField(type: string) {
    const id = `field_${Math.random().toString(36).slice(2, 9)}`
    const f: Field = { 
      id, 
      type, 
      label: getDefaultLabel(type),
      description: '',
    }
    // Initialize options for choice-based fields
    if (['multiple_choice', 'checkboxes', 'dropdown'].includes(type)) {
      f.options = [{ id: `opt_${Math.random().toString(36).slice(2, 9)}`, label: 'Option 1' }]
    }
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

  function duplicateField(id: string) {
    const field = fields.find((f) => f.id === id)
    if (!field) return
    const newId = `field_${Math.random().toString(36).slice(2, 9)}`
    const duplicate: Field = {
      ...field,
      id: newId,
      options: field.options?.map((opt) => ({
        ...opt,
        id: `opt_${Math.random().toString(36).slice(2, 9)}`,
      })),
    }
    setFields((s) => {
      const idx = s.findIndex((f) => f.id === id)
      const next = [...s]
      next.splice(idx + 1, 0, duplicate)
      const withOrder = next.map((it, i) => ({ ...it, order: i }))
      return withOrder
    })
    setSelected(newId)
    setIsDirty(true)
  }

  function addOption(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId)
    if (!field) return
    const optId = `opt_${Math.random().toString(36).slice(2, 9)}`
    const newOpt: FieldOption = { id: optId, label: `Option ${(field.options?.length || 0) + 1}` }
    updateField(fieldId, { options: [...(field.options || []), newOpt] })
  }

  function updateOption(fieldId: string, optionId: string, label: string) {
    const field = fields.find((f) => f.id === fieldId)
    if (!field || !field.options) return
    const updated = field.options.map((opt) => (opt.id === optionId ? { ...opt, label } : opt))
    updateField(fieldId, { options: updated })
  }

  function deleteOption(fieldId: string, optionId: string) {
    const field = fields.find((f) => f.id === fieldId)
    if (!field || !field.options || field.options.length <= 1) return
    const updated = field.options.filter((opt) => opt.id !== optionId)
    updateField(fieldId, { options: updated })
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
    if (to < 0 || to >= fields.length || from === to) return
    setFields((s) => {
      const updated = [...s]
      const [removed] = updated.splice(from, 1)
      updated.splice(to, 0, removed)
      const withOrder = updated.map((it, i) => ({ ...it, order: i }))
      setSelected(removed.id)
      return withOrder
    })
    setIsDirty(true)
  }

  function handleImport() {
    setShowImportModal(true)
  }

  function handleImportQuestions(questions: Array<{ question: string; options: string[] }>) {
    const newFields: Field[] = questions.map((q, idx) => ({
      id: `field_${Date.now()}_${idx}`,
      type: 'multiple_choice',
      label: q.question,
      required: false,
      options: q.options.map((opt, optIdx) => ({
        id: `opt_${Date.now()}_${idx}_${optIdx}`,
        label: opt,
      })),
    }))

    setFields((prev) => {
      // Insert after selected field; if nothing selected, append at end
      const found = prev.findIndex((x) => x.id === selected)
      const insertAt = found === -1 ? prev.length : found + 1
      const next = [...prev]
      next.splice(insertAt, 0, ...newFields)
      // Recompute orders
      const withOrder = next.map((it, i) => ({ ...it, order: i }))
      return withOrder
    })
    
    // Select the last imported field
    if (newFields.length > 0) {
      setSelected(newFields[newFields.length - 1].id)
    }
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
    }, 2000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, isDirty, formName])

  // Try to persist on unload using navigator.sendBeacon as a best-effort
  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return
      
      // Show browser warning dialog
      e.preventDefault()
      e.returnValue = ''
      
      // Try to save in background
      try {
        const url = `/api/forms/${formId}/save`
        const payload = JSON.stringify({ name: formName, schema: { fields } })
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } catch {
        // ignore
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [fields, isDirty, formId, formName])

  return (
    <>
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSaving={isSaving}
        isDirty={isDirty}
      />
      
      <div className={`min-h-svh ${themeColors.bg}`}>
      {activeTab === 'questions' && (
        <div className="max-w-6xl w-full mx-auto px-4 flex flex-col gap-4 py-8">
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
                <InspectorButtons onAdd={addField} onImport={handleImport} className="justify-center mt-4" />
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <React.Fragment key={f.id}>
                  {/* Drop zone indicator above field */}
                  {draggedIndex !== null && dropTarget === idx && draggedIndex !== idx && (
                    <div className="h-1 bg-primary rounded-full mb-2 transition-all" />
                  )}
                  
                  <div id={`field-${f.id}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDropTarget(idx)
                    }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      const from = Number(e.dataTransfer.getData('text/plain'))
                      const to = idx
                      if (Number.isNaN(from)) return
                      if (from === to) {
                        setDraggedIndex(null)
                        setDropTarget(null)
                        return
                      }
                      setFields((s) => {
                        const next = [...s]
                        const [moved] = next.splice(from, 1)
                        let insertAt = to
                        if (from < to) insertAt = to
                        next.splice(insertAt, 0, moved)
                        const withOrder = next.map((it, i) => ({ ...it, order: i }))
                        setSelected(moved.id)
                        return withOrder
                      })
                      setIsDirty(true)
                      setDraggedIndex(null)
                      setDropTarget(null)
                    }}
                    className={`relative p-4 border-2 rounded-md transition-all overflow-visible ${
                      selected === f.id
                        ? 'border-primary bg-primary/5 shadow-sm md:py-6'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${
                      draggedIndex === idx ? 'opacity-40' : ''
                    }`}
                    onClick={() => setSelected(f.id)}
                  >
                    <div className="flex flex-col gap-3">
                      {/* Field type selector - only shown when selected */}
                      {selected === f.id && (
                        <div className="md:hidden">
                          <select
                            value={f.type}
                            onChange={(e) => {
                              const newType = e.target.value
                              const oldDefaultLabel = getDefaultLabel(f.type)
                              const newDefaultLabel = getDefaultLabel(newType)
                              const update: Partial<Field> = { type: newType }
                              
                              // If label is still the default (or empty), update it to new default
                              if (f.label === oldDefaultLabel || f.label === '' || !f.label) {
                                update.label = newDefaultLabel
                              }
                              
                              // Initialize options for choice-based fields
                              if (['multiple_choice', 'checkboxes', 'dropdown'].includes(newType) && !f.options) {
                                update.options = [{ id: `opt_${Math.random().toString(36).slice(2, 9)}`, label: 'Option 1' }]
                              }
                              updateField(f.id, update)
                            }}
                            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {FIELD_TYPES.map((ft) => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                        {/* Text field: single textarea for content */}
                        {f.type === 'text' ? (
                          <textarea
                            value={f.label}
                            onChange={(e) => updateField(f.id, { label: e.target.value })}
                            placeholder="Enter text to display (this field cannot be edited by respondents)"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : f.type === 'section' ? (
                          /* Section: just a visual divider */
                          <div className="border-t-2 border-slate-300 py-4 text-sm text-muted-foreground text-center">
                            Section break
                          </div>
                        ) : (
                          /* Regular fields: title with red asterisk if required */
                          <>
                            <div className="flex items-start gap-2">
                              <Input
                                value={f.label}
                                onChange={(e) => updateField(f.id, { label: e.target.value })}
                                placeholder="Question"
                                className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-2"
                              />
                              {f.required && <span className="text-destructive text-base">*</span>}
                            </div>

                            {/* Description */}
                            <Input
                              value={f.description || ''}
                              onChange={(e) => updateField(f.id, { description: e.target.value })}
                              placeholder="Description (optional)"
                              className="text-sm border-0 px-0 text-muted-foreground focus-visible:ring-0"
                            />
                          </>
                        )}

                        {/* Field type-specific content */}
                        {f.type === 'multiple_choice' && (
                          <div className="space-y-2 mt-4">
                            {f.options?.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                                <Input
                                  value={opt.label}
                                  onChange={(e) => updateOption(f.id, opt.id, e.target.value)}
                                  placeholder={`Option ${optIdx + 1}`}
                                  className="flex-1 border-0 border-b rounded-none px-0 focus-visible:ring-0"
                                />
                                {f.options && f.options.length > 1 && (
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteOption(f.id, opt.id)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                addOption(f.id)
                              }}
                              className="text-muted-foreground"
                            >
                              Add option
                            </Button>
                          </div>
                        )}

                        {f.type === 'checkboxes' && (
                          <div className="space-y-2 mt-4">
                            {f.options?.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0" />
                                <Input
                                  value={opt.label}
                                  onChange={(e) => updateOption(f.id, opt.id, e.target.value)}
                                  placeholder={`Option ${optIdx + 1}`}
                                  className="flex-1 border-0 border-b rounded-none px-0 focus-visible:ring-0"
                                />
                                {f.options && f.options.length > 1 && (
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteOption(f.id, opt.id)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                addOption(f.id)
                              }}
                              className="text-muted-foreground"
                            >
                              Add option
                            </Button>
                          </div>
                        )}

                        {f.type === 'dropdown' && (
                          <div className="space-y-2 mt-4">
                            {f.options?.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-3">
                                <div className="text-muted-foreground text-sm shrink-0">{optIdx + 1}.</div>
                                <Input
                                  value={opt.label}
                                  onChange={(e) => updateOption(f.id, opt.id, e.target.value)}
                                  placeholder={`Option ${optIdx + 1}`}
                                  className="flex-1 border-0 border-b rounded-none px-0 focus-visible:ring-0"
                                />
                                {f.options && f.options.length > 1 && (
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteOption(f.id, opt.id)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                addOption(f.id)
                              }}
                              className="text-muted-foreground"
                            >
                              Add option
                            </Button>
                          </div>
                        )}

                        {f.type === 'short_text' && (
                          <div className="mt-4">
                            <Input
                              placeholder="Short answer text"
                              disabled
                              className="bg-transparent border-0 border-b rounded-none"
                            />
                          </div>
                        )}

                        {f.type === 'paragraph' && (
                          <div className="mt-4">
                            <Input
                              placeholder="Long answer text"
                              disabled
                              className="bg-transparent border-0 border-b rounded-none"
                            />
                          </div>
                        )}

                        {f.type === 'email' && (
                          <div className="mt-4">
                            <Input
                              type="email"
                              placeholder="user@example.com"
                              disabled
                              className="bg-transparent border-0 border-b rounded-none"
                            />
                          </div>
                        )}

                        {f.type === 'phone' && (
                          <div className="mt-4">
                            <Input
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              disabled
                              className="bg-transparent border-0 border-b rounded-none"
                            />
                          </div>
                        )}

                        {f.type === 'date' && (
                          <div className="mt-4">
                            <input
                              type="date"
                              disabled
                              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-sm"
                            />
                          </div>
                        )}

                        {f.type === 'time' && (
                          <div className="mt-4">
                            <input
                              type="time"
                              disabled
                              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-sm"
                            />
                          </div>
                        )}

                        {(f.type === 'linear_scale' || f.type === 'rating') && (
                          <div className="mt-4 text-sm text-muted-foreground">
                            Scale configuration (1-5, 1-10, etc.)
                          </div>
                        )}
                      </div>

                      {/* Field type selector - desktop (right side) */}
                      {selected === f.id && (
                        <div className="hidden md:block shrink-0">
                          <select
                            value={f.type}
                            onChange={(e) => {
                              const newType = e.target.value
                              const oldDefaultLabel = getDefaultLabel(f.type)
                              const newDefaultLabel = getDefaultLabel(newType)
                              const update: Partial<Field> = { type: newType }
                              
                              // If label is still the default (or empty), update it to new default
                              if (f.label === oldDefaultLabel || f.label === '' || !f.label) {
                                update.label = newDefaultLabel
                              }
                              
                              // Initialize options for choice-based fields
                              if (['multiple_choice', 'checkboxes', 'dropdown'].includes(newType) && !f.options) {
                                update.options = [{ id: `opt_${Math.random().toString(36).slice(2, 9)}`, label: 'Option 1' }]
                              }
                              updateField(f.id, update)
                            }}
                            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {FIELD_TYPES.map((ft) => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                    {selected === f.id && (
                      <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              setDraggedIndex(idx)
                              e.dataTransfer.setData('text/plain', String(idx))
                              e.dataTransfer.effectAllowed = 'move'
                              
                              // Create drag preview of entire field card
                              const fieldElement = document.getElementById(`field-${f.id}`)
                              if (fieldElement) {
                                const clone = fieldElement.cloneNode(true) as HTMLElement
                                clone.style.position = 'absolute'
                                clone.style.top = '-9999px'
                                clone.style.width = fieldElement.offsetWidth + 'px'
                                clone.style.opacity = '0.8'
                                document.body.appendChild(clone)
                                e.dataTransfer.setDragImage(clone, fieldElement.offsetWidth / 2, 20)
                                setTimeout(() => document.body.removeChild(clone), 0)
                              }
                            }}
                            onDragEnd={() => {
                              setDraggedIndex(null)
                              setDropTarget(null)
                            }}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="p-0"
                              title="Drag to reorder"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="p-0 cursor-pointer disabled:cursor-not-allowed"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveField(idx, idx + 1)
                            }}
                            title="Move down"
                            disabled={idx >= fields.length - 1}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="p-0 cursor-pointer disabled:cursor-not-allowed"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveField(idx, idx - 1)
                            }}
                            title="Move up"
                            disabled={idx === 0}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          {!['text', 'section'].includes(f.type) && (
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <span className="text-muted-foreground">Required</span>
                              <input
                                type="checkbox"
                                checked={f.required || false}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  updateField(f.id, { required: e.target.checked })
                                }}
                                className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                                  before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                                  checked:before:translate-x-5"
                              />
                            </label>
                          )}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateField(f.id)
                            }}
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteField(f.id)
                            }}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* render horizontal adder outside the question, between this and the next */}
                  {selected === f.id && (
                    <div className="mt-3">
                      <Card className="p-2 w-full">
                        <InspectorButtons onAdd={addField} onImport={handleImport} />
                      </Card>
                    </div>
                  )}

                  </React.Fragment>
                ))}
              </div>
            )}
          </Card>
        </div>



          </div>
        </div>
      )}

      {activeTab === 'responses' && <ResponsesTab formId={formId} fields={fields} />}
      {activeTab === 'send' && <SendTab publicId={publicId} formName={formName} />}
      {activeTab === 'settings' && (
        <SettingsTab formId={formId} theme={theme} onThemeChange={setTheme} />
      )}
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportQuestions}
      />
    </>
  )
}
