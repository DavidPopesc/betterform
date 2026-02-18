import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { getOrCreateFormAccountId } from '@/lib/form-account'

const resend = new Resend(process.env.RESEND_API_KEY || '')
const FROM_EMAIL = process.env.EMAIL_FROM || 'no-reply@example.com'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, formId } = body

    if (!email || !formId) {
      return NextResponse.json(
        { error: 'Email and formId are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get or create form account ID
    const formAccountId = await getOrCreateFormAccountId()

    // Check if this email is already verified for this account
    const { default: prisma } = await import('@/lib/db')
    const account = await prisma.formAccountUUID.findUnique({
      where: { id: formAccountId },
      select: { verifiedEmails: true },
    })

    if (account?.verifiedEmails?.includes(email)) {
      return NextResponse.json({ 
        success: true, 
        alreadyVerified: true,
        message: 'This email is already verified'
      })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30) // 30 minutes

    // Check if there's a pending verification for this email+form
    const existing = await prisma.emailVerificationRecord.findFirst({
      where: {
        formId,
        email,
        formAccountId,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (existing) {
      // Delete old pending verification
      await prisma.emailVerificationRecord.delete({
        where: { id: existing.id },
      })
    }

    // Create new verification record
    await prisma.emailVerificationRecord.create({
      data: {
        formId,
        email,
        formAccountId,
        tokenHash,
        expiresAt,
      },
    })

    // Get form name for email
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { name: true },
    })

    // Send verification email
    const verifyUrl = `${APP_URL}/api/verify-email/verify?token=${token}&formAccountId=${formAccountId}`

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Verify your email for ${form?.name || 'form'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify your email address</h2>
          <p>Please verify your email address to submit the form: <strong>${form?.name || 'Untitled form'}</strong></p>
          <p>
            <a href="${verifyUrl}" 
               style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Verify Email
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            This link will expire in 30 minutes. If you didn't request this verification, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Verification email sent' 
    })
  } catch (error) {
    console.error('Error sending verification email:', error)
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
