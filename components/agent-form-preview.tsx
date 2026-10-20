import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import PublicForm from '@/components/PublicForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { parseFormSchema } from '@/lib/form-schema'

type PreviewForm = {
  publicId: string
  name: string | null
  schema: unknown
  theme: string
  successMessage: string
}

// Shared shell for the claim page and the shareable preview of an agent-created form:
// a Better Form banner with page-specific actions, followed by the form in preview mode.
export function AgentFormPreview({ form, banner }: { form: PreviewForm; banner: ReactNode }) {
  const { fields } = parseFormSchema(form.schema)

  return (
    <div className="min-h-svh">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-900">
            <Image src="/betterformlogo.png" width={24} height={24} alt="Better Form logo" />
            Better Form
          </Link>
          {banner}
        </div>
      </div>
      <PublicForm
        publicId={form.publicId}
        formName={form.name || 'Untitled form'}
        fields={fields}
        theme={form.theme}
        successMessage={form.successMessage}
        previewMode
      />
    </div>
  )
}

export function UnavailableFormLink({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-md p-8 text-center">
        <Image src="/betterformlogo.png" width={40} height={40} alt="Better Form logo" className="mx-auto" />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Go to your dashboard</Link>
        </Button>
      </Card>
    </div>
  )
}
