"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function CreateFormButton({ label = 'Start' }: { label?: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch('/api/forms/create', { method: 'POST' })
      if (!res.ok) throw new Error('create-failed')
      const data = await res.json()
      if (data?.id) {
        router.push(`/forms/${data.id}/edit`)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={handleCreate} disabled={loading}>
      {loading ? 'Creating…' : label}
    </Button>
  )
}
