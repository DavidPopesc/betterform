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

  const schema = form.schema as { fields?: Array<Record<string, unknown>> }
  const fields = (schema.fields || []) as any[] // Type assertion for fields - schema validation happens at runtime
  const theme = form.theme ?? 'slate'

  return (
    <PublicForm 
      publicId={publicId} 
      formName={form.name || 'Untitled form'} 
      fields={fields}
      theme={theme}
      isQuiz={form.isQuiz ?? false}
      showScore={form.showScore ?? false}
      responsesEnabled={form.responsesEnabled ?? true}
      responseDeadline={form.responseDeadline}
      successMessage={form.successMessage ?? 'Your response has been recorded.'}
    />
  )
}

export const dynamic = 'force-dynamic'
