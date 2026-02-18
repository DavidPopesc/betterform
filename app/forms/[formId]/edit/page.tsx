import { redirect } from 'next/navigation'
import Editor from '@/components/form-editor/Editor'
import { getSessionUser } from '@/lib/auth-server'
import Image from "next/image"
import Link from 'next/link'

export default async function Page({ params }: { params: { formId?: string } | Promise<{ formId?: string }> }) {
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

  return (
    <div className="min-h-svh p-8">
      <Link href="/dashboard" className="flex items-center gap-4">
        <Image src="/betterformlogo.png" width={40} height={40} alt="Better Form logo" className="mb-4" />
        <h1 className="text-3xl font-semibold mb-4">Better Form</h1>
      </Link>
      {/* Editor is a client component that manages local state */}
      <Editor formId={formId} initialSchema={initialSchema} />
    </div>
  )
}
