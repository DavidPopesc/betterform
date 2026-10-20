import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AgentFormPreview, UnavailableFormLink } from '@/components/agent-form-preview'

export const metadata: Metadata = {
  title: 'Form preview · Better Form',
  robots: { index: false, follow: false },
}

// Shareable, read-only preview of an agent-created form. Unlike the claim link it
// grants nothing, and once the form is claimed it forwards to the live form.
export default async function PreviewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params

  const { default: prisma } = await import('@/lib/db')
  const form = await prisma.form.findUnique({ where: { publicId } })

  if (form?.accountId) redirect(`/f/${publicId}`)

  if (!form || !form.createdByAgent || (form.claimExpiresAt && form.claimExpiresAt < new Date())) {
    return (
      <UnavailableFormLink
        title="Preview not available"
        message="This preview expired or never existed. Unclaimed forms are kept for 14 days."
      />
    )
  }

  return (
    <AgentFormPreview
      form={form}
      message="Preview only. This form isn't accepting responses yet."
    />
  )
}

export const dynamic = 'force-dynamic'
