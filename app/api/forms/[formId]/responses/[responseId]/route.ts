import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ formId?: string; responseId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { formId, responseId } = await params
    if (!formId || !responseId) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const body = await req.json()
    if (typeof body.response !== 'object' || body.response === null) {
      return NextResponse.json({ error: 'invalid_response' }, { status: 400 })
    }

    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { accountId: true },
    })

    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const existingResponse = await prisma.response.findFirst({
      where: { id: responseId, formId },
      select: { id: true },
    })

    if (!existingResponse) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const response = await prisma.response.update({
      where: { id: responseId },
      data: {
        response: body.response,
      },
      select: {
        id: true,
        response: true,
        createdAt: true,
        respondentIp: true,
        submissionLocation: true,
      },
    })

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Update response error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ formId?: string; responseId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { formId, responseId } = await params
    if (!formId || !responseId) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { accountId: true },
    })

    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await prisma.response.delete({
      where: { id: responseId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete response error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
