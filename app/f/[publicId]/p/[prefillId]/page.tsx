import { notFound, redirect } from 'next/navigation'

import PublicForm from '@/components/PublicForm'
import { getPublicFormPayload } from '@/lib/public-form'

export default async function PrefilledPublicFormPage({
  params,
}: {
  params: Promise<{ publicId: string; prefillId: string }>
}) {
  const { publicId, prefillId } = await params
  const payload = await getPublicFormPayload(publicId, prefillId)

  if (!payload || !payload.prefill) {
    notFound()
  }

  redirect(`/f/${prefillId}`)
}

export const dynamic = 'force-dynamic'
