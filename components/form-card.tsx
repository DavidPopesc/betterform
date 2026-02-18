'use client'

import * as React from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import FormCardMenu from '@/components/FormCardMenu'
import { useRouter } from 'next/navigation'

type FormRecord = {
  id: string
  publicId?: string
  name?: string | null
  schema?: any
  createdAt?: string | Date
  updatedAt?: string | Date
}

export default function FormCard({ form }: { form: FormRecord }) {
  const router = useRouter()
  const title = form.name ?? 'Untitled form'
  const seed = encodeURIComponent(title + form.id)

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/forms/${form.id}/duplicate`, {
        method: 'POST',
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error('Duplicate failed:', err)
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <Card className="p-0 group relative flex flex-col">
      <Link href={`/forms/${form.id}/edit`} className="block overflow-hidden rounded-t-md">
        <div className="h-40 w-full bg-slate-100">
          <Image
            src={`https://picsum.photos/seed/${seed}/800/480`}
            alt={title}
            width={800}
            height={480}
            className="w-full h-full object-cover"
          />
        </div>
      </Link>
      <div className="relative flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          {form.updatedAt && (
            <div className="text-sm text-muted-foreground mt-1">
              {new Date(form.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
        <div className="absolute bottom-2 right-2 overflow-visible">
          <FormCardMenu
            formId={form.id}
            formName={title}
            publicId={form.publicId || ''}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </Card>
  )
}
