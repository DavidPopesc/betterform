import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { addVerifiedEmail } from '@/lib/form-account'

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

// Lucide icon SVGs
const icons = {
  xCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
}

function createVerificationPage(
  title: string,
  icon: string,
  iconColor: string,
  bgColor: string,
  message: string,
  email?: string,
  autoClose?: boolean
) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .fade-in {
        animation: fadeIn 0.3s ease-out;
      }
    </style>
  </head>
  <body class="min-h-screen flex items-center justify-center p-4 bg-slate-50">
    <div class="w-full max-w-md fade-in">
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div class="flex flex-col items-center text-center">
          <div class="${bgColor} rounded-full p-3 mb-4">
            <div class="${iconColor}">
              ${icon}
            </div>
          </div>
          <h1 class="text-2xl font-semibold text-slate-900 mb-2">${title}</h1>
          ${email ? `<div class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-md text-sm font-medium text-slate-700 mb-3">${email}</div>` : ''}
          <p class="text-slate-600 leading-relaxed">${message}</p>
        </div>
      </div>
      <p class="text-center text-xs text-slate-500 mt-4">
        You can safely close this window
      </p>
    </div>
    ${autoClose ? `<script>
      setTimeout(() => {
        if (window.opener) {
          window.opener.postMessage({ type: 'email-verified', email: '${email}' }, '*');
          window.close();
        }
      }, 3000);
    </script>` : ''}
  </body>
</html>`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const formAccountId = searchParams.get('formAccountId')

    if (!token || !formAccountId) {
      return new Response(
        createVerificationPage(
          'Invalid Link',
          icons.xCircle,
          'text-red-600',
          'bg-red-50',
          'This verification link is invalid. Please check the link in your email and try again.'
        ),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const tokenHash = sha256Hex(token)
    const { default: prisma } = await import('@/lib/db')

    // Find verification record
    const record = await prisma.emailVerificationRecord.findFirst({
      where: {
        tokenHash,
        formAccountId,
      },
    })

    if (!record) {
      return new Response(
        createVerificationPage(
          'Link Not Found',
          icons.alertCircle,
          'text-amber-600',
          'bg-amber-50',
          'This verification link is invalid or has already been used. Please request a new verification email.'
        ),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (record.verified) {
      return new Response(
        createVerificationPage(
          'Already Verified',
          icons.checkCircle,
          'text-green-600',
          'bg-green-50',
          'This email address has already been verified. You can close this window.',
          record.email
        ),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (record.expiresAt < new Date()) {
      return new Response(
        createVerificationPage(
          'Link Expired',
          icons.clock,
          'text-amber-600',
          'bg-amber-50',
          'This verification link has expired. Verification links are valid for 30 minutes. Please return to the form and request a new verification email.'
        ),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Mark as verified
    await prisma.emailVerificationRecord.update({
      where: { id: record.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    })

    // Add to form account verified emails
    await addVerifiedEmail(formAccountId, record.email)

    return new Response(
      createVerificationPage(
        'Email Verified!',
        icons.checkCircle,
        'text-green-600',
        'bg-green-50',
        'Your email address has been successfully verified. You can now return to the form and submit your response.',
        record.email,
        true
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Error verifying email:', error)
    return new Response(
      createVerificationPage(
        'Verification Error',
        icons.xCircle,
        'text-red-600',
        'bg-red-50',
        'An unexpected error occurred while verifying your email. Please try again or contact support if the problem persists.'
      ),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
}
