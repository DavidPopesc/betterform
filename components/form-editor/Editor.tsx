"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Field = {
  id: string
  type: string
  label: string
  required?: boolean
}

export default function Editor({ formId, initialSchema }: { formId: string; initialSchema: any }) {
  const [fields, setFields] = React.useState<Field[]>(initialSchema.fields ?? [])
  const [selected, setSelected] = React.useState<string | null>(fields[0]?.id ?? null)

  React.useEffect(() => {
    setFields(initialSchema.fields ?? [])
    setSelected((initialSchema.fields?.[0]?.id) ?? null)
  }, [initialSchema])

  function addField(type: string) {
    const id = Math.random().toString(36).slice(2, 9)
    const f: Field = { id, type, label: `${type.replace('_', ' ')} label` }
    setFields((s) => [...s, f])
    setSelected(id)
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const selectedField = fields.find((f) => f.id === selected) ?? null

  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-3">
        <Card className="p-4">
          <div className="font-semibold mb-2">Fields</div>
          <div className="flex flex-col gap-2">
            <Button variant="ghost" onClick={() => addField('short_text')}>Short text</Button>
            <Button variant="ghost" onClick={() => addField('paragraph')}>Paragraph</Button>
            <Button variant="ghost" onClick={() => addField('multiple_choice')}>Multiple choice</Button>
            <Button variant="ghost" onClick={() => addField('checkboxes')}>Checkboxes</Button>
          </div>
        </Card>
      </aside>

      <section className="col-span-6">
        <Card className="p-4">
          <div className="font-semibold mb-4">Form preview</div>
          <div className="space-y-3">
            {fields.map((f) => (
              <div
                key={f.id}
                className={`p-3 border rounded-md ${selected === f.id ? 'border-primary' : 'border-transparent'} hover:border-slate-200 cursor-pointer`}
                onClick={() => setSelected(f.id)}
              >
                <div className="text-sm text-muted-foreground">{f.type}</div>
                <div className="font-medium">{f.label}</div>
              </div>
            ))}
            {fields.length === 0 && <div className="text-sm text-muted-foreground">No fields yet — add one from the left.</div>}
          </div>
        </Card>
      </section>

      <aside className="col-span-3">
        <Card className="p-4">
          <div className="font-semibold mb-2">Inspector</div>
          {selectedField ? (
            <div className="space-y-2">
              <label className="text-sm block">Label</label>
              <input value={selectedField.label} onChange={(e) => updateField(selectedField.id, { label: e.target.value })} className="w-full rounded-md border px-2 py-1" />
              <label className="text-sm block mt-2">Required</label>
              <input type="checkbox" checked={!!selectedField.required} onChange={(e) => updateField(selectedField.id, { required: e.target.checked })} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a field to edit its properties.</div>
          )}
        </Card>
      </aside>
    </div>
  )
}
