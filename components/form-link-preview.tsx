'use client'

import { useEffect, useState } from 'react'
import { AgentFormPreview, UnavailableFormLink } from '@/components/agent-form-preview'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { decodeFormLink } from '@/lib/form-link'

type Issue = { path: string; message: string }
type PreviewForm = { name: string; theme: string; successMessage?: string; fields: unknown[] }

type State =
  | { status: 'loading' }
  | { status: 'invalid'; message: string; issues: Issue[] }
  | { status: 'ready'; definition: Record<string, unknown>; form: PreviewForm }

async function loadFromHash(): Promise<State> {
  const decoded = await decodeFormLink(window.location.hash || window.location.search)
  if (!decoded.ok) return { status: 'invalid', message: decoded.message, issues: [] }

  const res = await fetch('/api/agent/forms/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decoded.definition),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { status: 'invalid', message: 'This form link has some problems.', issues: data.issues ?? [] }
  }
  return { status: 'ready', definition: decoded.definition, form: data.form }
}

export default function FormLinkPreview({ loggedIn }: { loggedIn: boolean }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () => {
      loadFromHash()
        .then(setState)
        .catch(() => setState({ status: 'invalid', message: 'Could not load this form link.', issues: [] }))
    }
    load()
    window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
  }, [])

  if (state.status === 'loading') {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Loading form…</div>
  }

  if (state.status === 'invalid') {
    if (state.issues.length === 0) {
      return <UnavailableFormLink title="This form link doesn't work" message={state.message} />
    }
    const report = `Better Form rejected the form link:\n${state.issues.map((i) => `- ${i.path || '(form)'}: ${i.message}`).join('\n')}`
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-lg p-8">
          <h1 className="text-xl font-semibold text-slate-900">{state.message}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Copy this and paste it back to the AI that made the link so it can fix it.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-xs text-slate-700">{report}</pre>
          <Button className="mt-4" onClick={() => navigator.clipboard?.writeText(report)}>
            Copy
          </Button>
        </Card>
      </div>
    )
  }

  const addToAccount = async (then: 'signup' | 'login') => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/agent/forms/from-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition: state.definition, then }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.redirect) throw new Error(data.message || 'Something went wrong. Please try again.')
      window.location.assign(data.redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <AgentFormPreview
      form={{
        publicId: 'preview',
        name: state.form.name,
        schema: { fields: state.form.fields },
        theme: state.form.theme,
        successMessage: state.form.successMessage ?? 'Your response has been recorded.',
      }}
      banner={
        <div className="flex flex-col gap-3 sm:items-end">
          <p className="text-sm text-slate-600">
            This form was made for you. Add it to your account to edit it and start collecting responses.
          </p>
          {loggedIn ? (
            <Button disabled={submitting} onClick={() => addToAccount('signup')}>
              {submitting ? 'Adding…' : 'Add to my account'}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" disabled={submitting} onClick={() => addToAccount('login')}>
                Log in
              </Button>
              <Button disabled={submitting} onClick={() => addToAccount('signup')}>
                Sign up to add this form
              </Button>
            </div>
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      }
    />
  )
}
