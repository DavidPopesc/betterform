'use client'

export default function LocalizedDateTime({
  value,
  className,
}: {
  value: string | Date
  className?: string
}) {
  const date = new Date(value)
  const iso = date.toISOString()
  const formatted = date.toLocaleString()

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {formatted}
    </time>
  )
}
