import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import crypto from 'crypto'

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
    
    // Verify form ownership
    const form = await prisma.form.findUnique({ 
      where: { id: formId },
      select: { 
        accountId: true,
        apiEnabled: true,
        apiKey: true,
      }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      apiEnabled: form.apiEnabled,
      apiKey: form.apiKey,
    })
  } catch (err) {
    console.error('Fetch settings error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function POST(
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
    
    // Verify form ownership
    const form = await prisma.form.findUnique({ 
      where: { id: formId },
      select: { accountId: true, apiEnabled: true, apiKey: true }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    
    // Handle API toggle
    if (body.apiEnabled !== undefined) {
      const apiEnabled = Boolean(body.apiEnabled)
      let apiKey = form.apiKey
      
      // Generate new API key if enabling for the first time
      if (apiEnabled && !apiKey) {
        apiKey = `bf_${crypto.randomBytes(32).toString('hex')}`
      }
      
      // Clear API key if disabling
      if (!apiEnabled) {
        apiKey = null
      }
      
      await prisma.form.update({
        where: { id: formId },
        data: { apiEnabled, apiKey },
      })
      
      return NextResponse.json({ apiEnabled, apiKey })
    }
    
    // Handle key regeneration
    if (body.regenerateKey) {
      const apiKey = `bf_${crypto.randomBytes(32).toString('hex')}`
      
      await prisma.form.update({
        where: { id: formId },
        data: { apiKey },
      })
      
      return NextResponse.json({ apiKey })
    }

    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  } catch (err) {
    console.error('Update settings error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
