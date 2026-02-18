import { NextResponse } from 'next/server'
import { 
  getOrCreateFormAccountId, 
  getClientIp, 
  getDeviceMetrics, 
  updateFormAccountTracking,
  hasFormAccountSubmitted,
  hasEmailSubmitted,
  getVerifiedEmails 
} from '@/lib/form-account'

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
      select: { 
        id: true, 
        schema: true,
        responsesEnabled: true,
        responseDeadline: true,
        oneResponsePerEmail: true,
        oneResponsePerUser: true,
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'form_not_found' }, { status: 404 })
    }

    // Check if form is accepting responses
    if (!form.responsesEnabled) {
      return NextResponse.json({ 
        error: 'form_closed',
        message: 'This form is not accepting responses.'
      }, { status: 403 })
    }

    if (form.responseDeadline && new Date() > new Date(form.responseDeadline)) {
      return NextResponse.json({ 
        error: 'deadline_passed',
        message: 'The response deadline has passed.'
      }, { status: 403 })
    }

    const body = await req.json()
    const { responses } = body

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'invalid_response_data' }, { status: 400 })
    }

    // Get or create form account ID
    const formAccountId = await getOrCreateFormAccountId()

    // Get client IP and device metrics
    const ip = getClientIp(req.headers)
    const deviceMetrics = getDeviceMetrics(req.headers)

    // Update form account tracking
    await updateFormAccountTracking(formAccountId, {
      ip,
      deviceMetrics,
      formViewed: form.id,
    })

    // Extract email from responses (check for email field)
    const schema = form.schema as { fields?: Array<{ id: string; type: string }> }
    const emailField = schema.fields?.find(f => f.type === 'email')
    const respondentEmail = emailField ? String(responses[emailField.id] || '').toLowerCase().trim() : null

    // Check if email field requires verification
    if (emailField && respondentEmail) {
      const emailFieldSettings = schema.fields?.find(f => f.id === emailField.id) as { requireVerifiedEmail?: boolean } | undefined
      
      if (emailFieldSettings?.requireVerifiedEmail) {
        // Check if email is verified
        const verifiedEmails = await getVerifiedEmails(formAccountId)
        const isVerified = verifiedEmails.some(e => e.toLowerCase().trim() === respondentEmail)
        
        if (!isVerified) {
          return NextResponse.json({ 
            error: 'email_not_verified',
            message: 'Please verify your email address before submitting.'
          }, { status: 403 })
        }
      }
    }

    // Check one response per user (form account)
    if (form.oneResponsePerUser) {
      const hasSubmitted = await hasFormAccountSubmitted(formAccountId, form.id)
      if (hasSubmitted) {
        return NextResponse.json({ 
          error: 'already_submitted',
          message: 'You have already submitted this form.'
        }, { status: 403 })
      }
    }

    // Check one response per email
    if (form.oneResponsePerEmail && respondentEmail) {
      const emailSubmitted = await hasEmailSubmitted(respondentEmail, form.id)
      if (emailSubmitted) {
        return NextResponse.json({ 
          error: 'email_already_submitted',
          message: 'This email address has already been used to submit this form.'
        }, { status: 403 })
      }
    }

    // Create response record
    const response = await prisma.response.create({
      data: {
        formId: form.id,
        response: responses,
        respondentIp: ip,
        respondentEmail,
        formAccountId,
        processed: false,
      },
    })

    // Track submission in form account
    await updateFormAccountTracking(formAccountId, {
      formSubmitted: form.id,
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

