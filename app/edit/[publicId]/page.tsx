import type { Metadata } from 'next'
import { UnavailableFormLink } from '@/components/agent-form-preview'
import FormEditLink from '@/components/form-edit-link'
import { getSessionUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Suggested changes · Better Form',
  robots: { index: false, follow: false },
}

// An AI wrote suggested changes to an existing form into this link (/edit/{publicId}#…, same
// format as /new). For the form's owner it becomes a pending proposal they review in the editor.
export default async function EditFromLinkPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  const user = await getSessionUser()

  if (!user) {
    return (
      <UnavailableFormLink
        title="Log in to review these changes"
        message="An AI suggested changes to one of your forms. Log in to the account that owns the form, then open this link again."
        actionLabel="Log in"
        actionHref="/login"
      />
    )
  }

  const { default: prisma } = await import('@/lib/db')
  // Accept any share link the user might have given the AI: the form's own (/f/{publicId}) or a unique link (/f/{linkId}).
  const form =
    (await prisma.form.findUnique({ where: { publicId }, select: { id: true, accountId: true } })) ??
    (await prisma.formLink.findUnique({ where: { id: publicId }, select: { form: { select: { id: true, accountId: true } } } }))?.form ??
    null
  if (!form || form.accountId !== user.id) {
    return (
      <UnavailableFormLink
        title="This form isn't in your account"
        message="Only the form's owner can review suggested changes. Check that you're logged in to the right account."
      />
    )
  }

  return <FormEditLink formId={form.id} />
}

export const dynamic = 'force-dynamic'
