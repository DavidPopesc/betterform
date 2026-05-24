import { NextRequest, NextResponse } from 'next/server'

import { clearFormAccountCookie, deleteFormAccountRecord } from '@/lib/form-account'
import { clearSessionCookie, parseSessionCookie } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('bf_session')?.value
    const formAccountId = request.cookies.get('form_account_uuid')?.value

    if (token) {
      const { default: prisma } = await import('@/lib/db')
      const parsed = parseSessionCookie(token)

      if (parsed.type === 'jwt') {
        await prisma.session.deleteMany({
          where: { id: parsed.payload.sid, userId: parsed.payload.uid },
        })
      } else {
        await prisma.session.deleteMany({
          where: { tokenHash: parsed.tokenHash },
        })
      }
    }

    if (formAccountId) {
      await deleteFormAccountRecord(formAccountId)
    }

    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    clearFormAccountCookie(response)
    return response
  } catch (error) {
    console.error('Logout failed:', error)

    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    clearFormAccountCookie(response)
    return response
  }
}

export const dynamic = 'force-dynamic'