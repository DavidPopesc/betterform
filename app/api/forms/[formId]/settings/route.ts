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
        publicId: true,
        schema: true,
        apiEnabled: true,
        apiKey: true,
        webhookUrl: true,
        theme: true,
        isQuiz: true,
        showScore: true,
        successMessage: true,
        responsesEnabled: true,
        responseDeadline: true,
        oneResponsePerEmail: true,
        oneResponsePerUser: true,
      }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      publicId: form.publicId,
      schema: form.schema,
      apiEnabled: form.apiEnabled,
      apiKey: form.apiKey,
      webhookUrl: form.webhookUrl,
      theme: form.theme,
      isQuiz: form.isQuiz,
      showScore: form.showScore,
      successMessage: form.successMessage,
      responsesEnabled: form.responsesEnabled,
      responseDeadline: form.responseDeadline,
      oneResponsePerEmail: form.oneResponsePerEmail,
      oneResponsePerUser: form.oneResponsePerUser,
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
      select: { 
        accountId: true, 
        apiEnabled: true, 
        apiKey: true, 
        webhookUrl: true,
        theme: true, 
        isQuiz: true, 
        showScore: true, 
        successMessage: true, 
        responsesEnabled: true, 
        responseDeadline: true,
        oneResponsePerEmail: true,
        oneResponsePerUser: true,
      }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    
    // Handle theme change
    if (body.theme !== undefined) {
      const validThemes = ['blue', 'green', 'purple', 'pink', 'slate']
      const theme = validThemes.includes(body.theme) ? body.theme : 'blue'
      
      await prisma.form.update({
        where: { id: formId },
        data: { theme },
      })
      
      return NextResponse.json({ theme })
    }
    
    // Handle quiz mode toggle
    if (body.isQuiz !== undefined) {
      const isQuiz = Boolean(body.isQuiz)
      
      await prisma.form.update({
        where: { id: formId },
        data: { isQuiz },
      })
      
      return NextResponse.json({ isQuiz })
    }
    
    // Handle show score toggle
    if (body.showScore !== undefined) {
      const showScore = Boolean(body.showScore)
      
      await prisma.form.update({
        where: { id: formId },
        data: { showScore },
      })
      
      return NextResponse.json({ showScore })
    }
    
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

    // Handle success message
    if (body.successMessage !== undefined) {
      const successMessage = String(body.successMessage).slice(0, 500)
      
      await prisma.form.update({
        where: { id: formId },
        data: { successMessage },
      })
      
      return NextResponse.json({ successMessage })
    }

    // Handle responses enabled toggle
    if (body.responsesEnabled !== undefined) {
      const responsesEnabled = Boolean(body.responsesEnabled)
      
      await prisma.form.update({
        where: { id: formId },
        data: { responsesEnabled },
      })
      
      return NextResponse.json({ responsesEnabled })
    }

    // Handle response deadline
    if (body.responseDeadline !== undefined) {
      const responseDeadline = body.responseDeadline ? new Date(body.responseDeadline) : null
      
      await prisma.form.update({
        where: { id: formId },
        data: { responseDeadline },
      })
      
      return NextResponse.json({ responseDeadline })
    }

    // Handle one response per email toggle
    if (body.oneResponsePerEmail !== undefined) {
      const oneResponsePerEmail = Boolean(body.oneResponsePerEmail)
      
      await prisma.form.update({
        where: { id: formId },
        data: { oneResponsePerEmail },
      })
      
      return NextResponse.json({ oneResponsePerEmail })
    }

    // Handle one response per user toggle
    if (body.oneResponsePerUser !== undefined) {
      const oneResponsePerUser = Boolean(body.oneResponsePerUser)
      
      await prisma.form.update({
        where: { id: formId },
        data: { oneResponsePerUser },
      })
      
      return NextResponse.json({ oneResponsePerUser })
    }

    // Handle webhook URL
    if (body.webhookUrl !== undefined) {
      const webhookUrl = body.webhookUrl ? String(body.webhookUrl).slice(0, 500) : null
      
      await prisma.form.update({
        where: { id: formId },
        data: { webhookUrl },
      })
      
      return NextResponse.json({ webhookUrl })
    }

    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  } catch (err) {
    console.error('Update settings error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
