import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'

export async function GET(
  req: Request,
  { params }: { params: { formId?: string } | Promise<{ formId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const resolvedParams = (await params) as { formId?: string }
    const formId = resolvedParams?.formId
    if (!formId) return NextResponse.json({ error: 'invalid_form_id' }, { status: 400 })

    const { default: prisma } = await import('@/lib/db')
    
    // Verify form ownership and get schema
    const form = await prisma.form.findUnique({ 
      where: { id: formId },
      select: { 
        accountId: true,
        schema: true,
        name: true,
      }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Fetch all responses
    const responses = await prisma.response.findMany({
      where: { formId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        response: true,
        createdAt: true,
      },
    })

    // Extract fields from schema
    interface SchemaField {
      id: string
      type: string
      label: string
      options?: Array<{ id: string; label: string }>
    }
    const schema = form.schema as { fields?: SchemaField[] }
    const fields = (schema.fields || []).filter(
      (f) => f.type !== 'text' && f.type !== 'section'
    )

    // Build CSV
    const headers = ['Timestamp', ...fields.map((f) => f.label)]
    const rows = responses.map(r => {
      const row = [new Date(r.createdAt).toISOString()]
      const responseData = (r.response || {}) as Record<string, unknown>
      
      fields.forEach((field) => {
        const value = responseData[field.id]
        
        if (value === undefined || value === null || value === '') {
          row.push('')
        } else if (Array.isArray(value)) {
          // For checkboxes, join multiple values
          const labels = value.map((v: unknown) => {
            const opt = field.options?.find((o) => o.id === v)
            return opt?.label || String(v)
          })
          row.push(labels.join('; '))
        } else if (['multiple_choice', 'dropdown'].includes(field.type)) {
          // Convert option ID to label
          const opt = field.options?.find((o) => o.id === value)
          row.push(opt?.label || String(value))
        } else {
          row.push(String(value))
        }
      })
      
      return row
    })

    // Escape CSV values
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${form.name || 'form'}-responses-${Date.now()}.csv"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
