'use client'

import { useSyncExternalStore } from 'react'

export default function LocalizedDateTime({
  value,
  className,
}: {
  value: string | Date
  className?: string
}) {
  const date = new Date(value)
  const iso = date.toISOString()
  const formatted = useSyncExternalStore(
    () => () => {},
    () => new Date(value).toLocaleString(),
    () => iso
  )

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {formatted}
    </time>
  )
}
