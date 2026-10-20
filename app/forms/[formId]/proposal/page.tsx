import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AgentFormPreview } from '@/components/agent-form-preview'
import { Button } from '@/components/ui/button'
import { getSessionUser } from '@/lib/auth-server'
import { proposalDefinition } from '@/lib/form-proposals'

export const metadata: Metadata = {
  title: 'Suggested version · Better Form',
  robots: { index: false, follow: false },
}

// Owner-only preview of the AI's pending suggestion, opened from the editor banner.
export default async function ProposalPreviewPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getSessionUser()
  if (!user) return redirect('/login')

  const { formId } = await params
  const { default: prisma } = await import('@/lib/db')
  const form = await prisma.form.findUnique({ where: { id: formId }, select: { accountId: true, publicId: true } })
  if (!form || form.accountId !== user.id) return redirect('/dashboard')

  const proposal = await prisma.formEditProposal.findFirst({
    where: { formId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
  if (!proposal) return redirect(`/forms/${formId}/edit`)

  const definition = proposalDefinition(proposal.definition)
  return (
    <AgentFormPreview
      form={{
        publicId: form.publicId,
        name: definition.name,
        schema: { fields: definition.fields },
        theme: definition.theme,
        successMessage: definition.successMessage ?? 'Your response has been recorded.',
      }}
      message="Suggested version. Nothing has changed yet: go back to the editor to apply it or keep your current form."
      actions={
        <Button asChild>
          <Link href={`/forms/${formId}/edit`}>Back to editor</Link>
        </Button>
      }
    />
  )
}

export const dynamic = 'force-dynamic'
