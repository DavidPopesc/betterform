import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import crypto from 'crypto'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId?: string }> }
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
        submissionApiKey: true,
        dataApiKey: true,
        webhookUrl: true,
        theme: true,
        isQuiz: true,
        showScore: true,
        successMessage: true,
        allowAnotherResponse: true,
        responsesEnabled: true,
        responseDeadline: true,
        oneResponsePerEmail: true,
        oneResponsePerUser: true,
        requireLocationOnSubmit: true,
        geoLockEnabled: true,
        geoLockLatitude: true,
        geoLockLongitude: true,
        geoLockRadiusMeters: true,
        notifyOnLimitedViewVisit: true,
        notifyOnFormSubmission: true,
      }
    })
    
    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      publicId: form.publicId,
      schema: form.schema,
      apiEnabled: form.apiEnabled,
      submissionApiKey: form.submissionApiKey,
      dataApiKey: form.dataApiKey,
      webhookUrl: form.webhookUrl,
      theme: form.theme,
      isQuiz: form.isQuiz,
      showScore: form.showScore,
      successMessage: form.successMessage,
      allowAnotherResponse: form.allowAnotherResponse,
      responsesEnabled: form.responsesEnabled,
      responseDeadline: form.responseDeadline,
      oneResponsePerEmail: form.oneResponsePerEmail,
      oneResponsePerUser: form.oneResponsePerUser,
      requireLocationOnSubmit: form.requireLocationOnSubmit,
      geoLockEnabled: form.geoLockEnabled,
      geoLockLatitude: form.geoLockLatitude,
      geoLockLongitude: form.geoLockLongitude,
      geoLockRadiusMeters: form.geoLockRadiusMeters,
      notifyOnLimitedViewVisit: form.notifyOnLimitedViewVisit,
      notifyOnFormSubmission: form.notifyOnFormSubmission,
    })
  } catch (err) {
    console.error('Fetch settings error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formId?: string }> }
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
        submissionApiKey: true,
        dataApiKey: true,
        webhookUrl: true,
        theme: true, 
        isQuiz: true, 
        showScore: true, 
        successMessage: true, 
        allowAnotherResponse: true,
        responsesEnabled: true, 
        responseDeadline: true,
        oneResponsePerEmail: true,
        oneResponsePerUser: true,
        requireLocationOnSubmit: true,
        geoLockEnabled: true,
        geoLockLatitude: true,
        geoLockLongitude: true,
        geoLockRadiusMeters: true,
        notifyOnLimitedViewVisit: true,
        notifyOnFormSubmission: true,
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

    // Handle form name update
    if (body.name !== undefined) {
      const name = String(body.name || '').slice(0, 200).trim()
      
      await prisma.form.update({
        where: { id: formId },
        data: { name: name || null },
      })
      
      return NextResponse.json({ name })
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
      let submissionApiKey = form.submissionApiKey
      let dataApiKey = form.dataApiKey
      
      // Generate new API keys if enabling for the first time
      if (apiEnabled && !submissionApiKey) {
        submissionApiKey = `bf_sub_${crypto.randomBytes(32).toString('hex')}`
      }
      if (apiEnabled && !dataApiKey) {
        dataApiKey = `bf_data_${crypto.randomBytes(32).toString('hex')}`
      }
      
      // Clear API keys if disabling
      if (!apiEnabled) {
        submissionApiKey = null
        dataApiKey = null
      }
      
      await prisma.form.update({
        where: { id: formId },
        data: { apiEnabled, submissionApiKey, dataApiKey },
      })
      
      return NextResponse.json({ apiEnabled, submissionApiKey, dataApiKey })
    }
    
    // Handle submission key regeneration
    if (body.regenerateSubmissionKey) {
      const submissionApiKey = `bf_sub_${crypto.randomBytes(32).toString('hex')}`
      
      await prisma.form.update({
        where: { id: formId },
        data: { submissionApiKey },
      })
      
      return NextResponse.json({ submissionApiKey })
    }
    
    // Handle data key regeneration
    if (body.regenerateDataKey) {
      const dataApiKey = `bf_data_${crypto.randomBytes(32).toString('hex')}`
      
      await prisma.form.update({
        where: { id: formId },
        data: { dataApiKey },
      })
      
      return NextResponse.json({ dataApiKey })
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

    if (body.allowAnotherResponse !== undefined) {
      const allowAnotherResponse = Boolean(body.allowAnotherResponse)

      await prisma.form.update({
        where: { id: formId },
        data: { allowAnotherResponse },
      })

      return NextResponse.json({ allowAnotherResponse })
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

    if (body.notifyOnLimitedViewVisit !== undefined) {
      const notifyOnLimitedViewVisit = Boolean(body.notifyOnLimitedViewVisit)

      await prisma.form.update({
        where: { id: formId },
        data: { notifyOnLimitedViewVisit },
      })

      return NextResponse.json({ notifyOnLimitedViewVisit })
    }

    if (body.notifyOnFormSubmission !== undefined) {
      const notifyOnFormSubmission = Boolean(body.notifyOnFormSubmission)

      await prisma.form.update({
        where: { id: formId },
        data: { notifyOnFormSubmission },
      })

      return NextResponse.json({ notifyOnFormSubmission })
    }

    if (body.locationSettings !== undefined) {
      const rawSettings = typeof body.locationSettings === 'object' && body.locationSettings !== null
        ? body.locationSettings as Record<string, unknown>
        : {}

      const requireLocationOnSubmit = Boolean(rawSettings.requireLocationOnSubmit)
      const geoLockEnabled = Boolean(rawSettings.geoLockEnabled)
      const geoLockLatitude = rawSettings.geoLockLatitude === '' || rawSettings.geoLockLatitude === null || rawSettings.geoLockLatitude === undefined
        ? null
        : Number(rawSettings.geoLockLatitude)
      const geoLockLongitude = rawSettings.geoLockLongitude === '' || rawSettings.geoLockLongitude === null || rawSettings.geoLockLongitude === undefined
        ? null
        : Number(rawSettings.geoLockLongitude)
      const geoLockRadiusMeters = rawSettings.geoLockRadiusMeters === '' || rawSettings.geoLockRadiusMeters === null || rawSettings.geoLockRadiusMeters === undefined
        ? null
        : Number.parseInt(String(rawSettings.geoLockRadiusMeters), 10)

      const hasValidLatitude = geoLockLatitude === null || (Number.isFinite(geoLockLatitude) && geoLockLatitude >= -90 && geoLockLatitude <= 90)
      const hasValidLongitude = geoLockLongitude === null || (Number.isFinite(geoLockLongitude) && geoLockLongitude >= -180 && geoLockLongitude <= 180)
      const hasValidRadius = geoLockRadiusMeters === null || (Number.isFinite(geoLockRadiusMeters) && geoLockRadiusMeters > 0)

      if (!hasValidLatitude || !hasValidLongitude || !hasValidRadius) {
        return NextResponse.json({ error: 'invalid_location_settings' }, { status: 400 })
      }

      if (geoLockEnabled && (geoLockLatitude === null || geoLockLongitude === null || geoLockRadiusMeters === null)) {
        return NextResponse.json({ error: 'missing_geo_lock_settings' }, { status: 400 })
      }

      await prisma.form.update({
        where: { id: formId },
        data: {
          requireLocationOnSubmit,
          geoLockEnabled,
          geoLockLatitude,
          geoLockLongitude,
          geoLockRadiusMeters,
        },
      })

      return NextResponse.json({
        requireLocationOnSubmit,
        geoLockEnabled,
        geoLockLatitude,
        geoLockLongitude,
        geoLockRadiusMeters,
      })
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
