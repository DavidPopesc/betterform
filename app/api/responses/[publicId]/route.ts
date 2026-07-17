import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ publicId?: string }> }
) {
  try {
    const resolvedParams = (await params) as { publicId?: string }
    const publicId = resolvedParams?.publicId
    if (!publicId) return NextResponse.json({ error: 'invalid_public_id' }, { status: 400 })

    const { default: prisma } = await import('@/lib/db')
    
    // Find form by publicId and get its responses
    const form = await prisma.form.findUnique({ 
      where: { publicId },
      select: { 
        id: true,
        name: true,
        schema: true,
        dataApiKey: true,
      }
    })
    
    if (!form) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // Require data API key to fetch responses. Deny if no key configured.
    const authHeader = req.headers.get('authorization')
    const apiKeyFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!form.dataApiKey) {
      return NextResponse.json({ error: 'api_key_not_configured' }, { status: 403 })
    }

    if (!apiKeyFromHeader || apiKeyFromHeader !== form.dataApiKey) {
      return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
    }

    // Get all responses for this form
    const responses = await prisma.response.findMany({
      where: { formId: form.id },
      select: {
        id: true,
        createdAt: true,
        response: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parse schema to build field label map
    const schema = typeof form.schema === 'string' ? JSON.parse(form.schema) : form.schema
    const fieldLabels: Record<string, string> = {}
    
    if (Array.isArray(schema)) {
      schema.forEach((field: { id?: string; label?: string }) => {
        if (field.id && field.label) {
          fieldLabels[field.id] = field.label
        }
      })
    }

    // Transform responses to include field labels
    const transformedResponses = responses.map((response) => {
      const responseData = typeof response.response === 'string' ? JSON.parse(response.response) : response.response
      const transformedData: Record<string, unknown> = {}
      
      Object.entries(responseData).forEach(([fieldId, value]) => {
        const label = fieldLabels[fieldId] || fieldId
        transformedData[label] = value
      })
      
      return {
        id: response.id,
        timestamp: response.createdAt,
        data: transformedData,
      }
    })

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
      },
      responses: transformedResponses,
      count: transformedResponses.length,
    })
  } catch (err) {
    console.error('Get responses JSON error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
