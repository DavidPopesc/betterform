'use client'

import { useEffect, useState } from 'react'
import { UnavailableFormLink } from '@/components/agent-form-preview'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { decodeFormLink } from '@/lib/form-link'

type Issue = { path: string; message: string }

// Turns an AI-written /edit/{publicId}#… link into a pending proposal, then opens the editor,
// where the owner applies the changes or keeps the current form.
export default function FormEditLink({ formId }: { formId: string }) {
  const [failure, setFailure] = useState<{ message: string; issues: Issue[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function submit() {
      const decoded = await decodeFormLink(window.location.hash || window.location.search)
      if (!decoded.ok) return setFailure({ message: decoded.message, issues: [] })

      const res = await fetch(`/api/forms/${formId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decoded.definition),
      })
      const data = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok || !data.redirect) {
        return setFailure({ message: 'These suggested changes have some problems.', issues: data.issues ?? [] })
      }
      window.location.replace(data.redirect)
    }
    submit().catch(() => setFailure({ message: 'Could not load these suggested changes.', issues: [] }))
    return () => {
      cancelled = true
    }
  }, [formId])

  if (!failure) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Loading suggested changes…</div>
  }

  if (failure.issues.length === 0) {
    return <UnavailableFormLink title="This link doesn't work" message={failure.message} />
  }

  const report = `Better Form rejected the suggested changes:\n${failure.issues.map((i) => `- ${i.path || '(form)'}: ${i.message}`).join('\n')}`
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-xl font-semibold text-slate-900">{failure.message}</h1>
        <p className="mt-2 text-sm text-slate-600">Copy this and paste it back to the AI that made the link so it can fix it.</p>
        <pre className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-xs text-slate-700">{report}</pre>
        <Button className="mt-4" onClick={() => navigator.clipboard?.writeText(report)}>
          Copy
        </Button>
      </Card>
    </div>
  )
}
