import { NextResponse } from 'next/server'

// Rate limiting map: formId -> last request timestamp
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 5000 // 5 seconds

export async function GET(
  req: Request,
  { params }: { params: { apiKey?: string } | Promise<{ apiKey?: string }> }
) {
  try {
    const resolvedParams = (await params) as { apiKey?: string }
    const apiKey = resolvedParams?.apiKey
    
    if (!apiKey) {
      return NextResponse.json({ error: 'missing_api_key' }, { status: 400 })
    }

    const { default: prisma } = await import('@/lib/db')
    
    // Find form by API key
    const form = await prisma.form.findUnique({
      where: { apiKey },
      select: {
        id: true,
        name: true,
        apiEnabled: true,
        schema: true,
        responses: {
          select: {
            id: true,
            createdAt: true,
            response: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    if (!form) {
      return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
    }
    
    if (!form.apiEnabled) {
      return NextResponse.json({ error: 'api_disabled' }, { status: 403 })
    }

    // Check rate limit
    const now = Date.now()
    const lastRequest = rateLimitMap.get(form.id)
    
    if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
      const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000)
      return NextResponse.json(
        { error: 'rate_limited', retryAfter },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '1',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((lastRequest + RATE_LIMIT_MS) / 1000).toString()
          }
        }
      )
    }
    
    // Update rate limit
    rateLimitMap.set(form.id, now)

    // Return form data
    return NextResponse.json({
      formId: form.id,
      formName: form.name || 'Untitled Form',
      totalResponses: form.responses.length,
      responses: form.responses.map((r: { id: string; createdAt: Date; response: unknown }) => ({
        id: r.id,
        createdAt: r.createdAt,
        data: r.response
      }))
    })
  } catch (err) {
    console.error('Fetch form data error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
