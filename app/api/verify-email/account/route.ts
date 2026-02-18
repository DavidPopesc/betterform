import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateFormAccountId, getVerifiedEmails } from '@/lib/form-account'

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
