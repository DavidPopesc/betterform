import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { readFile } from 'fs/promises'
import path from 'path'

import { getSessionUser } from '@/lib/auth-server'
import { isRemoteBlobUrl } from '@/lib/blob'
import { normalizeValueForMatch, parseFormSchema } from '@/lib/form-schema'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ attachmentId?: string }> }
) {
  try {
    const user = await getSessionUser()
    const requestUrl = new URL(req.url)
    const sharedViewId = requestUrl.searchParams.get('viewId')?.trim() || null
    if (!user) {
      if (!sharedViewId) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      }
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
            response: true,
            form: {
              select: {
                accountId: true,
                schema: true,
              },
            },
          },
        },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const isOwner = user ? attachment.response.form.accountId === user.id : false

    if (!isOwner) {
      if (!sharedViewId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }

      const schema = parseFormSchema(attachment.response.form.schema)
      const sharedView = schema.limitedPublicViews.find((view) => view.id === sharedViewId)
      if (!sharedView) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }

      const responsePayload =
        typeof attachment.response.response === 'object' && attachment.response.response !== null
          ? attachment.response.response as Record<string, unknown>
          : {}

      const isMatchingRow =
        normalizeValueForMatch(responsePayload[sharedView.filterFieldId]) === normalizeValueForMatch(sharedView.filterValue)

      if (!isMatchingRow) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }

      const attachmentFieldId = schema.fields.find((field) => {
        if (field.type !== 'file_upload' || !sharedView.visibleFieldIds.includes(field.id)) {
          return false
        }

        const value = responsePayload[field.id]
        if (!Array.isArray(value)) return false

        return value.some((item) => (
          typeof item === 'object'
          && item !== null
          && 'attachmentId' in item
          && String((item as { attachmentId?: unknown }).attachmentId || '') === attachmentId
        ))
      })?.id

      if (!attachmentFieldId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
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
