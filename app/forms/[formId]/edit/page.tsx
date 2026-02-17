import { redirect } from 'next/navigation'
import Editor from '@/components/form-editor/Editor'
import { getSessionUser } from '@/lib/auth-server'

export default async function Page({ params }: { params: { formId?: string } | Promise<{ formId?: string }> }) {
  const user = await getSessionUser()
  if (!user) return redirect('/login')

  // `params` may be a promise in some Next.js environments — await it first
  const resolvedParams = (await params) as { formId?: string }
  const formId = resolvedParams?.formId
  if (!formId) return redirect('/dashboard')

  const { default: prisma } = await import('@/lib/db')
  const form = await prisma.form.findUnique({ where: { id: formId } })

  const initialSchema = form?.schema ?? { fields: [] }

  return (
    <div className="min-h-svh p-8">
      <h1 className="text-2xl font-semibold mb-4">Form Editor</h1>
      {/* Editor is a client component that manages local state */}
      <Editor formId={formId} initialSchema={initialSchema} />
    </div>
  )
}
