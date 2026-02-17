import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import crypto from 'crypto'

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export async function POST(req: Request) {
  try {
    const cookieStore = (await Promise.resolve(cookies() as any)) as any
    const token = cookieStore.get?.('bf_session')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const tokenHash = sha256Hex(token)
    const session = await prisma.session.findFirst({ where: { tokenHash, revoked: false }, include: { user: true } })
    if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const accountId = session.user.id

    const newForm = await prisma.form.create({
      data: {
        accountId,
        name: 'Untitled form',
        schema: { fields: [] },
      },
    })

    return NextResponse.json({ id: newForm.id })
  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
