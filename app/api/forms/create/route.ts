import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSessionUser } from '@/lib/auth-server'

export async function POST() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const newForm = await prisma.form.create({
      data: {
        accountId: user.id,
        name: 'Untitled form',
        schema: { fields: [] },
      },
    })

    return NextResponse.json({ id: newForm.id })
  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
