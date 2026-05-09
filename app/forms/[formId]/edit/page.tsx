import { redirect } from 'next/navigation'
import Editor from '@/components/form-editor/Editor'
import { getSessionUser } from '@/lib/auth-server'

export default async function Page({ params }: { params: Promise<{ formId?: string }> }) {
  const user = await getSessionUser()
  if (!user) return redirect('/login')

  // `params` may be a promise in some Next.js environments — await it first
  const resolvedParams = (await params) as { formId?: string }
  const formId = resolvedParams?.formId
  if (!formId) return redirect('/dashboard')

  const { default: prisma } = await import('@/lib/db')
  const form = await prisma.form.findUnique({ where: { id: formId } })

  const schema = (form?.schema as { fields?: unknown[] } | null) ?? { fields: [] }
  const initialSchema = { fields: schema.fields as unknown[], name: form?.name ?? undefined }
  const publicId = form?.publicId ?? formId // fallback to formId if publicId not set yet
  const theme = form?.theme ?? 'slate'

  return (
    <div className="min-h-svh">
      {/* Editor is a client component that manages local state */}
      <Editor formId={formId} publicId={publicId} initialSchema={initialSchema} initialTheme={theme} />
    </div>
  )
}
