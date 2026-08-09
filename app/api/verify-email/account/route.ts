import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateFormAccountId, getVerifiedEmails, removeVerifiedEmail } from '@/lib/form-account'

export async function GET(request: NextRequest) {
  try {
    const formAccountId = await getOrCreateFormAccountId()
    const verifiedEmails = await getVerifiedEmails(formAccountId)

    return NextResponse.json({
      formAccountId,
      verifiedEmails,
    })
  } catch (error) {
    console.error('Error fetching verified emails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verified emails' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email : null

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const formAccountId = await getOrCreateFormAccountId()
    await removeVerifiedEmail(formAccountId, email)
    const verifiedEmails = await getVerifiedEmails(formAccountId)

    return NextResponse.json({ verifiedEmails })
  } catch (error) {
    console.error('Error removing verified email:', error)
    return NextResponse.json(
      { error: 'Failed to remove verified email' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
