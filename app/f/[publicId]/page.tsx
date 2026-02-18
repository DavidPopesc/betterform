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
    },
  })

  if (!form) {
    notFound()
  }

  const schema = form.schema as { fields?: any[] }
  const fields = schema.fields || []
  const theme = form.theme ?? 'slate'

  return (
    <PublicForm 
      publicId={publicId} 
      formName={form.name || 'Untitled form'} 
      fields={fields}
      theme={theme}
    />
  )
}

export const dynamic = 'force-dynamic'
