import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

import { parseFormSchema } from '@/lib/form-schema'

type UploadClientPayload = {
  publicId: string
  fieldId: string
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!clientPayload) {
          throw new Error('Missing upload context')
        }

        const payload = JSON.parse(clientPayload) as UploadClientPayload
        if (!payload.publicId || !payload.fieldId) {
          throw new Error('Invalid upload context')
        }

        const { default: prisma } = await import('@/lib/db')
        const form = await prisma.form.findUnique({
          where: { publicId: payload.publicId },
          select: {
            schema: true,
          },
        })

        if (!form) {
          throw new Error('Form not found')
        }

        const schema = parseFormSchema(form.schema)
        const field = schema.fields.find((item) => item.id === payload.fieldId && item.type === 'file_upload')
        if (!field) {
          throw new Error('Upload field not found')
        }

        const allowedContentTypes = (field.allowedFileTypes || []).filter((value) => !value.startsWith('.'))
        const allowedPathPrefix = `forms/${payload.publicId}/${payload.fieldId}/`
        if (!pathname.startsWith(allowedPathPrefix)) {
          throw new Error('Invalid upload pathname')
        }

        return {
          allowedContentTypes: allowedContentTypes.length > 0 ? allowedContentTypes : undefined,
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(payload),
        }
      },
      onUploadCompleted: async () => {
        // Better Form persists attachment metadata at form submit time.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}

export const dynamic = 'force-dynamic'
