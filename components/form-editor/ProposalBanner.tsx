'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProposalSummary } from '@/lib/form-proposals'

export type PendingProposal = {
  id: string
  createdAt: string
  summary: ProposalSummary
  // The form was saved after the AI made its suggestion; applying would undo those edits.
  formChangedSince: boolean
}

function Line({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <li>
      <span className="font-medium">{label}:</span> {items.join(', ')}
    </li>
  )
}

/**
 * Shown above the editor while an AI-suggested version of the form is waiting for the owner.
 * `onBeforeApply` lets the editor stop autosaving so its local copy can't overwrite the change.
 */
export default function ProposalBanner({
  formId,
  proposal,
  hasUnsavedEdits,
  onBeforeApply,
  onApplyFailed,
}: {
  formId: string
  proposal: PendingProposal
  hasUnsavedEdits: boolean
  onBeforeApply: () => void
  onApplyFailed: () => void
}) {
  const [busy, setBusy] = React.useState<'apply' | 'dismiss' | null>(null)
  const [hidden, setHidden] = React.useState(false)
  const [error, setError] = React.useState('')
  const { summary } = proposal

  if (hidden) return null

  const resolve = async (action: 'apply' | 'dismiss') => {
    setBusy(action)
    setError('')
    if (action === 'apply') onBeforeApply()
    try {
      const res = await fetch(`/api/forms/${formId}/proposals/${proposal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(res.status === 409 ? 'This suggestion was already handled. Reload the page.' : 'Something went wrong. Try again.')
      if (action === 'apply') {
        window.location.reload()
        return
      }
      setHidden(true)
    } catch (err) {
      if (action === 'apply') onApplyFailed()
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setBusy(null)
    }
  }

  const changed = summary.changed.map((item) => `${item.label} (${item.changes.join(', ')})`)
  const settings = [
    summary.name ? `title to "${summary.name.to}"` : '',
    summary.theme ? `theme to ${summary.theme.to}` : '',
    summary.successMessageChanged ? 'confirmation message' : '',
  ].filter(Boolean)

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2 text-sm text-amber-950">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            An AI assistant suggested changes to this form
            <span className="font-normal text-amber-800">· {new Date(proposal.createdAt).toLocaleString()}</span>
          </p>
          {summary.hasChanges ? (
            <ul className="space-y-0.5">
              <Line label="Add" items={summary.added} />
              <Line label="Remove" items={summary.removed} />
              <Line label="Change" items={changed} />
              <Line label="Update" items={settings} />
              {summary.reordered ? <li>Reorders questions</li> : null}
            </ul>
          ) : (
            <p>The suggestion matches your current form.</p>
          )}
          {summary.removed.length > 0 ? (
            <p className="text-amber-800">Answers already collected for removed questions are kept, but won&apos;t show in the form.</p>
          ) : null}
          {proposal.formChangedSince || hasUnsavedEdits ? (
            <p className="font-medium text-amber-900">
              You&apos;ve edited this form since the suggestion was made. Applying it replaces your questions with the suggested ones.
            </p>
          ) : null}
          {error ? <p className="text-red-700">{error}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="bg-white">
            <Link href={`/forms/${formId}/proposal`}>Preview</Link>
          </Button>
          <Button variant="outline" size="sm" className="bg-white" disabled={!!busy} onClick={() => resolve('dismiss')}>
            {busy === 'dismiss' ? 'Keeping…' : 'Keep current form'}
          </Button>
          <Button size="sm" disabled={!!busy} onClick={() => resolve('apply')}>
            {busy === 'apply' ? 'Applying…' : 'Apply changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
