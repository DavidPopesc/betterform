import type { Metadata } from 'next'
import FormLinkPreview from '@/components/form-link-preview'
import { getSessionUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Your new form · Better Form',
  robots: { index: false, follow: false },
}

// Opens a form an AI packed into the link (betterform.dev/new#…). The definition lives in
// the URL fragment, which the browser never sends here; see lib/form-link.ts.
export default async function NewFormFromLinkPage() {
  const user = await getSessionUser()
  return <FormLinkPreview loggedIn={!!user} />
}

export const dynamic = 'force-dynamic'
