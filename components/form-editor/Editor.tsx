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
import { Trash2, Copy, ArrowUp, ArrowDown, GripVertical, Check } from 'lucide-react'
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
  requireVerifiedEmail?: boolean
  order?: number
  options?: FieldOption[]
  allowedFileTypes?: string[]
  maxFiles?: number
  points?: number
  correctAnswer?: string | string[]
  scaleStyle?: 'numbers' | 'stars' | 'faces'
  scaleMax?: number
  // `legal_text` fields
  content?: string
  // `signature` fields
  signatureMode?: 'draw' | 'type' | 'either'
  // set on the contract's required verified-email field; blocks deletion/toggling while a signature field exists
  contractLocked?: boolean
}

// Ensures a form containing a `signature` field always has a required, verified email field —
// reuses an existing `email` field if present, otherwise inserts one at the top of the list.
function ensureContractEmailField(fieldsList: Field[]): Field[] {
  const existingEmailIdx = fieldsList.findIndex((f) => f.type === 'email')
  if (existingEmailIdx !== -1) {
    const next = [...fieldsList]
    next[existingEmailIdx] = {
      ...next[existingEmailIdx],
      required: true,
      requireVerifiedEmail: true,
      contractLocked: true,
    }
    return next
  }
  const emailField: Field = {
    id: `field_${Math.random().toString(36).slice(2, 9)}`,
    type: 'email',
    label: getDefaultLabel('email'),
    description: '',
    required: true,
    requireVerifiedEmail: true,
    contractLocked: true,
  }
  return [emailField, ...fieldsList]
}

function normalizeScaleField(field: Field): Field {
  if (field.type === 'linear_scale') {
    return { ...field, type: 'scale', scaleStyle: 'numbers', scaleMax: 5 }
  }

  if (field.type === 'rating') {
    return { ...field, type: 'scale', scaleStyle: 'stars', scaleMax: Math.max(3, Math.min(field.scaleMax || 5, 5)) }
  }

  return field
}

export const FIELD_TYPES = [
  { value: 'short_text', label: 'Short answer' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'file_upload', label: 'File upload' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'scale', label: 'Scale' },
  { value: 'legal_text', label: 'Contract text' },
  { value: 'signature', label: 'Signature' },
  { value: 'text', label: 'Text' },
  { value: 'section', label: 'Section' },
] as const

export function getDefaultLabel(type: string): string {
  const fieldType = FIELD_TYPES.find(ft => ft.value === type)
  if (type === 'text') return ''
  if (type === 'section') return 'Section break'
  if (type === 'email') return 'Email address'
  if (type === 'phone') return 'Phone number'
  if (type === 'file_upload') return 'Upload files'
  if (type === 'scale') return 'Scale question'
  if (type === 'legal_text') return 'Contract terms'
  if (type === 'signature') return 'Signature'
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
  const [fields, setFields] = React.useState<Field[]>(((initialSchema.fields as Field[]) ?? []).map(normalizeScaleField))
  // form name (stored in DB `name`), and fields (schema) stored separately
  const [formName, setFormName] = React.useState<string>(initialSchema?.name ?? initialSchema?.title ?? 'Untitled form')
  const [selected, setSelected] = React.useState<string | null>(fields[0]?.id ?? null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dropTarget, setDropTarget] = React.useState<number | null>(null)
  const [showImportModal, setShowImportModal] = React.useState(false)
  const [isQuiz, setIsQuiz] = React.useState(false)

  // Load quiz mode setting
  React.useEffect(() => {
    async function loadQuizMode() {
      try {
        const res = await fetch(`/api/forms/${formId}/settings`)
        if (res.ok) {
          const data = await res.json()
          setIsQuiz(data.isQuiz || false)
        }
      } catch (err) {
        console.error('Failed to load quiz mode:', err)
      }
    }
    void loadQuizMode()
  }, [formId])

  React.useEffect(() => {
    // load fields but strip any legacy `form_title` entries from stored schema
    const loaded = ((initialSchema.fields ?? []) as Field[])
      .filter((f) => f.type !== 'form_title')
      .map(normalizeScaleField)
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
    if (type === 'file_upload') {
      f.allowedFileTypes = []
      f.maxFiles = 1
    }
    if (type === 'scale') {
      f.scaleStyle = 'numbers'
      f.scaleMax = 5
    }
    if (type === 'legal_text') {
      f.content = ''
    }
    if (type === 'signature') {
      f.signatureMode = 'either'
    }
    // Set default points when quiz mode is enabled
    if (isQuiz && !['text', 'section', 'email', 'phone', 'legal_text', 'signature'].includes(type)) {
      f.points = 1
    }
    setFields((s) => {
      // insert after selected field; if nothing selected, append at end
      const found = s.findIndex((x) => x.id === selected)
      const insertAt = found === -1 ? s.length : found + 1
      let next = [...s]
      next.splice(insertAt, 0, { ...f })
      // A signature field requires a locked, verified email field to identify the signer
      if (type === 'signature') {
        next = ensureContractEmailField(next)
      }
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

  function handleOptionKeyDown(fieldId: string, nextIndex: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return

    event.preventDefault()
    addOption(fieldId)

    requestAnimationFrame(() => {
      const nextInput = document.querySelector<HTMLInputElement>(`[data-option-input="${fieldId}-${nextIndex}"]`)
      nextInput?.focus()
      nextInput?.select()
    })
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
    // The contract's required verified-email field can't be removed while a signature field exists
    if (toDelete.contractLocked) return
    setFields((s) => {
      const next = s.filter((f) => f.id !== id)
      if (toDelete.type === 'signature' && !next.some((f) => f.type === 'signature')) {
        // no signature fields remain — release the lock on the email field
        return next.map((f) => (f.contractLocked ? { ...f, contractLocked: false } : f))
      }
      return next
    })
    if (selected === id) {
      setSelected(fields.length > 1 ? fields[0].id : null)
    }
    setIsDirty(true)
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields((s) => s.map((f) => {
      if (f.id !== id) return f
      if (f.contractLocked) {
        // can't change type, un-require, or turn off verification on the contract's email field
        const { required: _required, requireVerifiedEmail: _requireVerifiedEmail, type: _type, ...safePatch } = patch
        return { ...f, ...safePatch }
      }
      return { ...f, ...patch }
    }))
    setIsDirty(true)
  }

  function handleFieldTypeChange(f: Field, newType: string) {
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
    if (newType === 'scale') {
      update.scaleStyle = 'numbers'
      update.scaleMax = 5
    }
    if (newType === 'legal_text') {
      update.content = f.content ?? ''
    }
    if (newType === 'signature') {
      update.signatureMode = f.signatureMode ?? 'either'
    }

    if (newType === 'signature' && f.type !== 'signature') {
      setFields((s) => {
        const withUpdate = s.map((x) => (x.id === f.id ? { ...x, ...update } : x))
        const withEmail = ensureContractEmailField(withUpdate)
        return withEmail.map((it, i) => ({ ...it, order: i }))
      })
      setIsDirty(true)
      return
    }

    updateField(f.id, update)
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
        body: JSON.stringify({
          name: formName,
          schema: {
            fields,
          },
        }),
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

            {isQuiz && (() => {
              const totalPoints = fields.reduce((sum, f) => {
                if (['text', 'section', 'email', 'phone'].includes(f.type)) return sum
                return sum + (f.points || 0)
              }, 0)
              return totalPoints > 0 ? (
                <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
                  <span className="font-semibold">Quiz Mode:</span> Total {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
                </div>
              ) : null
            })()}

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
                            disabled={f.contractLocked}
                            onChange={(e) => handleFieldTypeChange(f, e.target.value)}
                            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {FIELD_TYPES.map((ft) => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label}
                              </option>
                            ))}
                          </select>
                          {f.contractLocked && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Required for contract signing — can&apos;t be changed or removed while a signature field is on this form.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                        {/* Text field: single textarea for content */}
                        {f.type === 'text' ? (
                          <div className="space-y-3">
                            <Input
                              value={f.label}
                              onChange={(e) => updateField(f.id, { label: e.target.value })}
                              placeholder="Title (optional)"
                              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-2"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <textarea
                              value={f.description || ''}
                              onChange={(e) => updateField(f.id, { description: e.target.value })}
                              placeholder="Description text"
                              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
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
                            {isQuiz && (
                              <div className="text-xs text-muted-foreground mb-2">
                                Click the checkmark to mark the correct answer
                              </div>
                            )}
                            {f.options?.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-3">
                                {isQuiz ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateField(f.id, { correctAnswer: opt.id })
                                    }}
                                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
                                      f.correctAnswer === opt.id
                                        ? 'bg-green-500 border-green-500'
                                        : 'border-red-500 hover:border-green-400'
                                    }`}
                                    title="Mark as correct answer"
                                  >
                                    {f.correctAnswer === opt.id && <Check className="w-3 h-3 text-white" />}
                                  </button>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                                )}
                                <Input
                                  value={opt.label}
                                  onChange={(e) => updateOption(f.id, opt.id, e.target.value)}
                                  onKeyDown={(e) => handleOptionKeyDown(f.id, optIdx + 1, e)}
                                  data-option-input={`${f.id}-${optIdx}`}
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
                            {isQuiz && (
                              <div className="text-xs text-muted-foreground mb-2">
                                Click the checkmark to select correct answer(s)
                              </div>
                            )}
                            {f.options?.map((opt, optIdx) => {
                              const correctAnswers = Array.isArray(f.correctAnswer) ? f.correctAnswer : []
                              const isCorrect = correctAnswers.includes(opt.id)
                              
                              return (
                                <div key={opt.id} className="flex items-center gap-3">
                                  {isQuiz ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const current = Array.isArray(f.correctAnswer) ? f.correctAnswer : []
                                        const updated = isCorrect
                                          ? current.filter(id => id !== opt.id)
                                          : [...current, opt.id]
                                        updateField(f.id, { correctAnswer: updated })
                                      }}
                                      className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition ${
                                        isCorrect
                                          ? 'bg-green-500 border-green-500'
                                          : 'border-red-500 hover:border-green-400'
                                      }`}
                                      title="Mark as correct answer"
                                    >
                                      {isCorrect && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                  ) : (
                                    <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0" />
                                  )}
                                  <Input
                                    value={opt.label}
                                    onChange={(e) => updateOption(f.id, opt.id, e.target.value)}
                                    onKeyDown={(e) => handleOptionKeyDown(f.id, optIdx + 1, e)}
                                    data-option-input={`${f.id}-${optIdx}`}
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
                              )
                            })}
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
                            {isQuiz && (
                              <div className="text-xs text-muted-foreground mb-2">
                                Click the checkmark to mark the correct answer
                              </div>
                            )}
                            {f.options?.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-3">
                                {isQuiz ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateField(f.id, { correctAnswer: opt.id })
                                    }}
                                    className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition ${
                                      f.correctAnswer === opt.id
                                        ? 'bg-green-500 border-green-500'
                                        : 'border-slate-300 hover:border-green-400'
                                    }`}
                                    title="Mark as correct answer"
                                  >
                                    {f.correctAnswer === opt.id && <Check className="w-3 h-3 text-white" />}
                                  </button>
                                ) : (
                                  <div className="text-muted-foreground text-sm shrink-0">{optIdx + 1}.</div>
                                )}
                                <Input
                                  value={opt.label}
                                  onChange={(e) => updateOption(f.id, opt.id, e.target.value)}
                                  onKeyDown={(e) => handleOptionKeyDown(f.id, optIdx + 1, e)}
                                  data-option-input={`${f.id}-${optIdx}`}
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
                          <div className="mt-4 space-y-3">
                            <Input
                              placeholder="Short answer text"
                              disabled
                              className="bg-transparent border-0 border-b rounded-none"
                            />
                            {isQuiz && (
                              <div className="pt-2 border-t border-slate-200">
                                <label className="text-xs text-muted-foreground block mb-1">Correct Answer (optional)</label>
                                <Input
                                  value={(typeof f.correctAnswer === 'string' ? f.correctAnswer : '') || ''}
                                  onChange={(e) => updateField(f.id, { correctAnswer: e.target.value })}
                                  placeholder="Enter the correct answer for grading"
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {f.type === 'paragraph' && (
                          <div className="mt-4 space-y-3">
                            <Input
                              placeholder="Long answer text"
                              disabled
                              className="bg-transparent border-0 border-b rounded-none"
                            />
                            {isQuiz && (
                              <div className="pt-2 border-t border-slate-200">
                                <label className="text-xs text-muted-foreground block mb-1">Correct Answer (optional)</label>
                                <textarea
                                  value={(typeof f.correctAnswer === 'string' ? f.correctAnswer : '') || ''}
                                  onChange={(e) => updateField(f.id, { correctAnswer: e.target.value })}
                                  placeholder="Enter the correct answer for grading"
                                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            )}
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

                        {f.type === 'file_upload' && (
                          <div className="mt-4 space-y-3">
                            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-muted-foreground">
                              Drag files here or click to browse
                            </div>
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Allowed file types</label>
                                <Input
                                  value={(f.allowedFileTypes || []).join(', ')}
                                  onChange={(e) =>
                                    updateField(f.id, {
                                      allowedFileTypes: e.target.value
                                        .split(',')
                                        .map((value) => value.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder=".pdf, .png, image/*"
                                  className="text-sm"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Use extensions like <code>.pdf</code>, MIME types like <code>application/pdf</code>, or wildcards like <code>image/*</code>.
                                </p>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Max files</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={f.maxFiles ?? 1}
                                  onChange={(e) =>
                                    updateField(f.id, {
                                      maxFiles: Math.max(1, Math.min(10, Number.parseInt(e.target.value || '1', 10) || 1)),
                                    })
                                  }
                                  className="text-sm"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">Hard max is 10 files. Each file is capped at 10 MB.</p>
                              </div>
                            </div>
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

                        {f.type === 'scale' && (
                          <div className="mt-4 space-y-3">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Style</label>
                                <select
                                  value={f.scaleStyle || 'numbers'}
                                  onChange={(e) => {
                                    const style = e.target.value as Field['scaleStyle']
                                    updateField(f.id, {
                                      scaleStyle: style,
                                      scaleMax: style === 'numbers' ? 5 : style === 'stars' ? Math.max(3, Math.min(f.scaleMax || 5, 5)) : Math.max(2, Math.min(f.scaleMax || 5, 5)),
                                    })
                                  }}
                                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                >
                                  <option value="numbers">Numbers (1-5)</option>
                                  <option value="stars">Stars</option>
                                  <option value="faces">Faces</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Count</label>
                                <select
                                  value={(f.scaleStyle || 'numbers') === 'numbers' ? 5 : f.scaleMax || 5}
                                  onChange={(e) => updateField(f.id, { scaleMax: Number.parseInt(e.target.value, 10) })}
                                  disabled={(f.scaleStyle || 'numbers') === 'numbers'}
                                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                                >
                                  {(f.scaleStyle || 'numbers') === 'stars' && [3, 4, 5].map((count) => (
                                    <option key={count} value={count}>{count} stars</option>
                                  ))}
                                  {(f.scaleStyle || 'numbers') === 'faces' && [2, 3, 4, 5].map((count) => (
                                    <option key={count} value={count}>{count} faces</option>
                                  ))}
                                  {(f.scaleStyle || 'numbers') === 'numbers' && <option value={5}>1-5</option>}
                                </select>
                              </div>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                              {(f.scaleStyle || 'numbers') === 'numbers' && 'Respondents will choose a number from 1 to 5.'}
                              {(f.scaleStyle || 'numbers') === 'stars' && `Respondents will choose from ${f.scaleMax || 5} stars.`}
                              {(f.scaleStyle || 'numbers') === 'faces' && `Respondents will choose from ${f.scaleMax || 5} faces.`}
                            </div>
                          </div>
                        )}

                        {f.type === 'legal_text' && (
                          <div className="mt-4 space-y-2">
                            <textarea
                              value={f.content || ''}
                              onChange={(e) => updateField(f.id, { content: e.target.value })}
                              placeholder="Paste or write the contract terms respondents will read before signing…"
                              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-40 focus:outline-none focus:ring-2 focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}

                        {f.type === 'signature' && (
                          <div className="mt-4 space-y-2">
                            <label className="mb-1 block text-xs text-muted-foreground">Signature method</label>
                            <select
                              value={f.signatureMode || 'either'}
                              onChange={(e) => updateField(f.id, { signatureMode: e.target.value as Field['signatureMode'] })}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="either">Draw or type</option>
                              <option value="draw">Draw only</option>
                              <option value="type">Type only</option>
                            </select>
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                              Signing captures an audit trail (IP address, device info, timestamp) and locks this response from further edits.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Field type selector - desktop (right side) */}
                      {selected === f.id && (
                        <div className="hidden md:block shrink-0">
                          <select
                            value={f.type}
                            disabled={f.contractLocked}
                            onChange={(e) => handleFieldTypeChange(f, e.target.value)}
                            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {FIELD_TYPES.map((ft) => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label}
                              </option>
                            ))}
                          </select>
                          {f.contractLocked && (
                            <p className="mt-1 max-w-40 text-xs text-muted-foreground">
                              Required for contract signing.
                            </p>
                          )}
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
                          {!['text', 'section', 'legal_text'].includes(f.type) && (
                            <>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <span className="text-muted-foreground">Required</span>
                                <input
                                  type="checkbox"
                                  checked={f.required || false}
                                  disabled={f.contractLocked}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    updateField(f.id, { required: e.target.checked })
                                  }}
                                  className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary disabled:cursor-not-allowed disabled:opacity-60
                                    before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                                    checked:before:translate-x-5"
                                />
                              </label>
                              {f.type === 'email' && (
                                <label className="flex items-center gap-2 text-sm cursor-pointer" title="Require users to verify their email address">
                                  <span className="text-muted-foreground">Verify email</span>
                                  <input
                                    type="checkbox"
                                    checked={(f as { requireVerifiedEmail?: boolean }).requireVerifiedEmail || false}
                                    disabled={f.contractLocked}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      updateField(f.id, { requireVerifiedEmail: e.target.checked })
                                    }}
                                    className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary disabled:cursor-not-allowed disabled:opacity-60
                                      before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                                      checked:before:translate-x-5"
                                  />
                                </label>
                              )}
                              {isQuiz && !['text', 'section', 'email', 'phone', 'legal_text', 'signature'].includes(f.type) && (
                                <label className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Points</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={f.points === undefined ? '' : f.points}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                      updateField(f.id, { points: val })
                                    }}
                                    placeholder="0"
                                    className="w-16 border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </label>
                              )}
                            </>
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
                            disabled={f.contractLocked}
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteField(f.id)
                            }}
                            title={f.contractLocked ? "Required for contract signing — can't be removed" : "Delete"}
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
      {activeTab === 'send' && <SendTab publicId={publicId} formId={formId} formName={formName} fields={fields} />}
      {activeTab === 'settings' && (
        <SettingsTab formId={formId} theme={theme} onThemeChange={setTheme} onQuizModeChange={setIsQuiz} />
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
