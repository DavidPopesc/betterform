'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import FormCard from '@/components/form-card'

type FormRecord = {
  id: string
  publicId?: string
  name?: string | null
  schema?: unknown
  createdAt?: string | Date
  updatedAt?: string | Date
}

interface DashboardClientProps {
  forms: FormRecord[]
  searchInputId: string
}

const templates = [
  { title: "Assessment", color: "bg-amber-100" },
  { title: "Exit Ticket", color: "bg-emerald-100" },
  { title: "Contact Information", color: "bg-lime-100" },
  { title: "RSVP", color: "bg-rose-100" },
]

export default function DashboardClient({ forms, searchInputId }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const input = document.getElementById(searchInputId) as HTMLInputElement
    if (!input) return

    function handleInput() {
      setSearchQuery(input.value)
    }

    input.addEventListener('input', handleInput)
    return () => input.removeEventListener('input', handleInput)
  }, [searchInputId])

  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) return forms
    const query = searchQuery.toLowerCase()
    return forms.filter((form) => 
      (form.name || 'Untitled form').toLowerCase().includes(query)
    )
  }, [forms, searchQuery])

  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <section>
        <h2 className="text-lg font-medium">Start a new form</h2>
        <div className="mt-4 flex gap-4 overflow-x-auto py-2">
          <Card className="min-w-[220px] max-w-[220px] shrink-0 flex-col items-start justify-between p-4">
            <div className="flex w-full items-start gap-3">
              <div className="h-20 w-20 rounded-md bg-gradient-to-br from-sky-300 to-indigo-400 flex items-center justify-center text-white text-2xl overflow-hidden">+</div>
              <div className="flex-1">
                <h3 className="font-semibold">Blank form</h3>
                <p className="text-sm text-muted-foreground mt-1">Create a form from scratch</p>
              </div>
            </div>
          </Card>

          {templates.map((t) => (
            <Card key={t.title} className="min-w-[220px] max-w-[220px] shrink-0 p-0 overflow-hidden">
              <div className={`${t.color} h-28 w-full`} />
              <div className="p-4">
                <div className="font-semibold">{t.title}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {searchQuery ? `Search results (${filteredForms.length})` : 'Recent forms'}
          </h2>
          {!searchQuery && (
            <div className="text-sm text-muted-foreground">Owned by anyone ▾</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredForms.length > 0 ? (
            filteredForms.map((f) => (
              <FormCard key={f.id} form={f} />
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              {searchQuery ? 'No forms found matching your search' : 'No forms yet. Create your first one!'}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
