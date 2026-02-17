import * as React from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'

type FormRecord = {
  id: string
  name?: string | null
  schema?: any
  updatedAt?: string
}

export default function FormCard({ form }: { form: FormRecord }) {
  const title = form.name ?? 'Untitled form'
  // Use a seeded placeholder image for visual variety; replace with real thumbnail if available
  const seed = encodeURIComponent(title + form.id)

  return (
    <Card className="p-0 overflow-hidden">
      <div className="h-40 w-full rounded-t-md overflow-hidden bg-slate-100">
        <Image
          src={`https://picsum.photos/seed/${seed}/800/480`}
          alt={title}
          width={800}
          height={480}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="font-semibold">{title}</div>
        {form.updatedAt && <div className="text-sm text-muted-foreground mt-1">{new Date(form.updatedAt).toLocaleString()}</div>}
      </div>
    </Card>
  )
}
