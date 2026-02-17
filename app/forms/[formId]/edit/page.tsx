import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import Editor from '@/components/form-editor/Editor'

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export default async function Page({ params }: { params: { formId?: string } | Promise<{ formId?: string }> }) {
  const cookieStore = (await Promise.resolve(cookies() as any)) as any
  const token = cookieStore.get?.('bf_session')?.value
  if (!token) return redirect('/login')

  const tokenHash = sha256Hex(token)
  const session = await prisma.session.findFirst({ where: { tokenHash, revoked: false }, include: { user: true } })
  if (!session) return redirect('/login')

  // `params` may be a promise in some Next.js environments — await it first
  const resolvedParams = (await params) as { formId?: string }
  const formId = resolvedParams?.formId
  if (!formId) return redirect('/dashboard')

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
