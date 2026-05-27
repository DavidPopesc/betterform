import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { readFile } from 'fs/promises'
import path from 'path'

import { getSessionUser } from '@/lib/auth-server'
import { isRemoteBlobUrl } from '@/lib/blob'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ attachmentId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const resolvedParams = await params
    const attachmentId = resolvedParams.attachmentId

    if (!attachmentId) {
      return NextResponse.json({ error: 'invalid_attachment_id' }, { status: 400 })
    }

    const { default: prisma } = await import('@/lib/db')
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        filename: true,
        mimeType: true,
        url: true,
        response: {
          select: {
            form: {
              select: {
                accountId: true,
              },
            },
          },
        },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    if (attachment.response.form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    if (isRemoteBlobUrl(attachment.url)) {
      const blob = await get(attachment.url, { access: 'private' })
      if (!blob || blob.statusCode !== 200 || !blob.stream) {
        return NextResponse.json({ error: 'blob_unavailable' }, { status: 404 })
      }

      return new NextResponse(blob.stream, {
        headers: {
          'Content-Type': attachment.mimeType || blob.blob.contentType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${attachment.filename}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    const filePath = path.join(process.cwd(), attachment.url)
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${attachment.filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Attachment fetch error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
