import { notFound } from 'next/navigation'
import PublicForm from '@/components/PublicForm'
import { getPublicFormPayload } from '@/lib/public-form'

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const { publicId } = await params

  const payload = await getPublicFormPayload(publicId)

  if (!payload) {
    notFound()
  }

  return (
    <PublicForm 
      publicId={payload.publicId} 
      formName={payload.form.name || 'Untitled form'} 
      fields={payload.fields}
      theme={payload.theme}
      isQuiz={payload.form.isQuiz ?? false}
      showScore={payload.form.showScore ?? false}
      isClosed={payload.isClosed}
      closedReason={payload.closedReason}
      successMessage={payload.form.successMessage ?? 'Your response has been recorded.'}
      prefillValues={payload.prefill?.values}
      hiddenFieldIds={payload.prefill?.hiddenFieldIds}
      locationSettings={payload.locationSettings}
      allowAnotherResponse={payload.allowAnotherResponse}
    />
  )
}

export const dynamic = 'force-dynamic'
