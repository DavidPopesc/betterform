import type { Metadata } from 'next'
import { AgentFormPreview, UnavailableFormLink } from '@/components/agent-form-preview'
import { Button } from '@/components/ui/button'
import { getSessionUser } from '@/lib/auth-server'
import { hashToken } from '@/lib/agent-forms'

export const metadata: Metadata = {
  title: 'Your new form · Better Form',
  robots: { index: false, follow: false },
}

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { default: prisma } = await import('@/lib/db')
  const form = await prisma.form.findUnique({ where: { claimTokenHash: hashToken(token) } })

  if (!form || form.accountId || (form.claimExpiresAt && form.claimExpiresAt < new Date())) {
    return (
      <UnavailableFormLink
        title="This link is no longer active"
        message="The form was already added to an account, or the link expired. Unclaimed forms are kept for 14 days."
      />
    )
  }

  const user = await getSessionUser()
  const action = `/api/claim/${encodeURIComponent(token)}`

  return (
    <AgentFormPreview
      form={form}
      banner={
        <div className="flex flex-col gap-3 sm:items-end">
          <p className="text-sm text-slate-600">
            This form was made for you. Add it to your account to edit it and start collecting responses.
          </p>
          {user ? (
            <form action={action} method="post">
              <Button type="submit">Add to my account</Button>
            </form>
          ) : (
            <div className="flex gap-2">
              <form action={action} method="post">
                <input type="hidden" name="then" value="login" />
                <Button type="submit" variant="outline">Log in</Button>
              </form>
              <form action={action} method="post">
                <input type="hidden" name="then" value="signup" />
                <Button type="submit">Sign up to add this form</Button>
              </form>
            </div>
          )}
        </div>
      }
    />
  )
}

export const dynamic = 'force-dynamic'
