import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { readFile } from 'fs/promises'
import path from 'path'

import { getSessionUser } from '@/lib/auth-server'
import { isRemoteBlobUrl } from '@/lib/blob'
import { normalizeValueForMatch, parseFormSchema } from '@/lib/form-schema'

// Types that are safe to render inline in a browser without risk of the
// browser executing the content (e.g. HTML/SVG with embedded scripts).
// Everything else is force-downloaded regardless of what content type is
// reported, since both the DB-stored mimeType and (for uploads on fields
// with no type restriction) the blob's own content type can be attacker
// controlled.
const SAFE_INLINE_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/x-icon',
  'application/pdf',
  'text/plain',
])

function resolveContentDisposition(contentType: string, filename: string) {
  const disposition = SAFE_INLINE_CONTENT_TYPES.has(contentType.toLowerCase()) ? 'inline' : 'attachment'
  const sanitized = filename.replace(/["\r\n]/g, '_')
  // Header values must be Latin-1 (ByteString); filenames often aren't (e.g. macOS
  // screenshot names contain a narrow no-break space, U+202F). Provide an ASCII-only
  // `filename=` fallback plus the full name percent-encoded via `filename*=` (RFC 6266),
  // which all modern browsers prefer and use for downloads/inline display.
  // why does macos have to be so special (wilt emoji)
  const asciiFallback = sanitized.replace(/[^\x20-\x7E]/g, '_')
  const encoded = encodeURIComponent(sanitized)
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}

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

      // Use the blob's own recorded content type, never the client-supplied
      // (and DB-stored) mimeType, which an uploader fully controls.
      const contentType = blob.blob.contentType || 'application/octet-stream'

      return new NextResponse(blob.stream, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': resolveContentDisposition(contentType, attachment.filename),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    const baseDir = process.cwd()
    const filePath = path.normalize(path.join(baseDir, attachment.url))
    if (!filePath.startsWith(baseDir + path.sep)) {
      return NextResponse.json({ error: 'invalid_attachment_path' }, { status: 400 })
    }

    const fileBuffer = await readFile(filePath)
    const contentType = attachment.mimeType || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': resolveContentDisposition(contentType, attachment.filename),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Attachment fetch error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
