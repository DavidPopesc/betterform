import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { getSessionUser } from '@/lib/auth-server'
import { parseFormSchema, withUpdatedSchema } from '@/lib/form-schema'
import type { Prisma } from '@/lib/generated/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { formId } = await params
    if (!formId) return NextResponse.json({ error: 'invalid_form_id' }, { status: 400 })

    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { accountId: true, schema: true, publicId: true },
    })

    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const schema = parseFormSchema(form.schema)

    return NextResponse.json({
      publicId: form.publicId,
      prefills: schema.prefills,
      limitedPublicViews: schema.limitedPublicViews,
    })
  } catch (error) {
    console.error('Sharing config fetch error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formId?: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { formId } = await params
    if (!formId) return NextResponse.json({ error: 'invalid_form_id' }, { status: 400 })

    const { default: prisma } = await import('@/lib/db')
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { accountId: true, schema: true, publicId: true },
    })

    if (!form || form.accountId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const action = String(body.action || '')
    const schema = parseFormSchema(form.schema)

    if (action === 'create_prefill') {
      const name = String(body.name || 'Prefill link').trim()
      const values = (typeof body.values === 'object' && body.values !== null ? body.values : {}) as Record<string, unknown>
      const hiddenFieldIds = Array.isArray(body.hiddenFieldIds)
        ? body.hiddenFieldIds.map((value: unknown) => String(value))
        : []

      const prefill = {
        id: crypto.randomUUID(),
        name: name || 'Prefill link',
        values,
        hiddenFieldIds,
        createdAt: new Date().toISOString(),
      }

      const nextSchema = withUpdatedSchema(form.schema, {
        prefills: [...schema.prefills, prefill],
      })

      await prisma.form.update({
        where: { id: formId },
        data: { schema: nextSchema as Prisma.InputJsonValue },
      })

      return NextResponse.json({
        prefill,
        url: `/f/${prefill.id}`,
      })
    }

    if (action === 'create_limited_public_view') {
      const name = String(body.name || 'Limited public view').trim()
      const filterFieldId = String(body.filterFieldId || '').trim()
      const filterValue = String(body.filterValue || '').trim()
      const visibleFieldIds = Array.isArray(body.visibleFieldIds)
        ? body.visibleFieldIds.map((value: unknown) => String(value))
        : []

      if (!filterFieldId || !filterValue || visibleFieldIds.length === 0) {
        return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
      }

      const view = {
        id: crypto.randomUUID(),
        name: name || 'Limited public view',
        filterFieldId,
        filterValue,
        visibleFieldIds,
        createdAt: new Date().toISOString(),
      }

      const nextSchema = withUpdatedSchema(form.schema, {
        limitedPublicViews: [...schema.limitedPublicViews, view],
      })

      await prisma.form.update({
        where: { id: formId },
        data: { schema: nextSchema as Prisma.InputJsonValue },
      })

      return NextResponse.json({
        view,
        url: `/f/${form.publicId}/responses/view/${view.id}`,
      })
    }

    if (action === 'delete_prefill') {
      const prefillId = String(body.prefillId || '')
      const nextSchema = withUpdatedSchema(form.schema, {
        prefills: schema.prefills.filter((prefill) => prefill.id !== prefillId),
      })

      await prisma.form.update({
        where: { id: formId },
        data: { schema: nextSchema as Prisma.InputJsonValue },
      })

      return NextResponse.json({ ok: true })
    }

    if (action === 'delete_limited_public_view') {
      const viewId = String(body.viewId || '')
      const nextSchema = withUpdatedSchema(form.schema, {
        limitedPublicViews: schema.limitedPublicViews.filter((view) => view.id !== viewId),
      })

      await prisma.form.update({
        where: { id: formId },
        data: { schema: nextSchema as Prisma.InputJsonValue },
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  } catch (error) {
    console.error('Sharing config update error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
