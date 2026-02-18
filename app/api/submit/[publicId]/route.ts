import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { publicId?: string } | Promise<{ publicId?: string }> }
) {
  try {
    const resolvedParams = (await params) as { publicId?: string }
    const publicId = resolvedParams?.publicId
    if (!publicId) {
      return NextResponse.json({ error: 'invalid_public_id' }, { status: 400 })
    }

    // Find form by publicId
    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({
      where: { publicId },
      select: { id: true, schema: true },
    })

    if (!form) {
      return NextResponse.json({ error: 'form_not_found' }, { status: 404 })
    }

    const body = await req.json()
    const { responses } = body

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'invalid_response_data' }, { status: 400 })
    }

    // Get client IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown'

    // Create response record
    const response = await prisma.response.create({
      data: {
        formId: form.id,
        response: responses,
        respondentIp: ip,
        processed: false,
      },
    })

    return NextResponse.json({ 
      success: true, 
      responseId: response.id 
    })
  } catch (err) {
    console.error('Form submission error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
