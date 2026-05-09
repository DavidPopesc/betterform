import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId?: string }> }
) {
  try {
    const resolvedParams = (await params) as { publicId?: string }
    const publicId = resolvedParams?.publicId

    if (!publicId) {
      return NextResponse.json({ error: 'invalid_public_id' }, { status: 400 })
    }

    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({
      where: { publicId },
      select: { id: true },
    })

    if (!form) {
      return NextResponse.json({ error: 'form_not_found' }, { status: 404 })
    }

    return NextResponse.json({ formId: form.id })
  } catch (error) {
    console.error('Error fetching form ID:', error)
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
