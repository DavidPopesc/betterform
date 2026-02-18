import { notFound } from 'next/navigation'
import PublicForm from '@/components/PublicForm'

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const { publicId } = await params

  const { default: prisma } = await import('@/lib/db')
  const form = await prisma.form.findUnique({
    where: { publicId },
    select: {
      id: true,
      name: true,
      schema: true,
      theme: true,
      isQuiz: true,
      showScore: true,
      responsesEnabled: true,
      responseDeadline: true,
      successMessage: true,
    },
  })

  if (!form) {
    notFound()
  }

  // Check if form is closed
  const isClosed = !form.responsesEnabled || (form.responseDeadline ? new Date() > new Date(form.responseDeadline) : false)
  
  const schema = form.schema as { fields?: Array<Record<string, unknown>> }
  // Don't send fields to client if form is closed; type assertion safe as schema validation happens at form creation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields = (isClosed ? [] : (schema.fields || [])) as any[]
  const theme = form.theme ?? 'slate'

  return (
    <PublicForm 
      publicId={publicId} 
      formName={form.name || 'Untitled form'} 
      fields={fields}
      theme={theme}
      isQuiz={form.isQuiz ?? false}
      showScore={form.showScore ?? false}
      isClosed={isClosed}
      closedReason={!form.responsesEnabled 
        ? 'This form is not accepting responses.' 
        : 'The response deadline has passed. This form is no longer accepting submissions.'}
      successMessage={form.successMessage ?? 'Your response has been recorded.'}
    />
  )
}

export const dynamic = 'force-dynamic'
