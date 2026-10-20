import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { getSessionUser } from '@/lib/auth-server'
import { parseFormSchema, withUpdatedSchema } from '@/lib/form-schema'
import { MAX_LINK_LABEL_LENGTH, serializeFormLink } from '@/lib/form-links'
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
    const visits = await prisma.limitedPublicViewVisit.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        viewId: true,
        viewName: true,
        createdAt: true,
        userAgent: true,
      },
    })
    const limitedPublicViewStats = schema.limitedPublicViews.map((view) => {
      const matchingVisits = visits.filter((visit) => visit.viewId === view.id)
      return {
        viewId: view.id,
        totalViews: matchingVisits.length,
        lastViewedAt: matchingVisits[0]?.createdAt ?? null,
        recentVisits: matchingVisits.slice(0, 10),
      }
    })

    const [links, linkResponseCounts] = await Promise.all([
      prisma.formLink.findMany({ where: { formId }, orderBy: { createdAt: 'desc' } }),
      prisma.response.groupBy({ by: ['formLinkId'], where: { formId, formLinkId: { not: null } }, _count: true }),
    ])
    const countByLink = new Map(linkResponseCounts.map((row) => [row.formLinkId, row._count]))

    return NextResponse.json({
      publicId: form.publicId,
      links: links.map((link) => serializeFormLink(link, countByLink.get(link.id) ?? 0)),
      limitedPublicViews: schema.limitedPublicViews,
      limitedPublicViewStats,
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

    if (action === 'create_link' || action === 'update_link') {
      const input = parseLinkInput(body, schema.fields.map((field) => field.id))
      if (!input.ok) return NextResponse.json({ error: 'invalid_link', message: input.message }, { status: 400 })

      if (action === 'create_link') {
        const link = await prisma.formLink.create({ data: { formId, ...input.value } })
        return NextResponse.json({ link: serializeFormLink(link, 0), url: `/f/${link.id}` })
      }

      const linkId = String(body.linkId || '')
      const updated = await prisma.formLink.updateMany({ where: { id: linkId, formId }, data: input.value })
      if (updated.count === 0) return NextResponse.json({ error: 'link_not_found' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete_link') {
      // Responses keep the link's label (formLinkLabel) after it's deleted.
      await prisma.formLink.deleteMany({ where: { id: String(body.linkId || ''), formId } })
      return NextResponse.json({ ok: true })
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

    if (action === 'update_limited_public_view') {
      const viewId = String(body.viewId || '').trim()
      const name = String(body.name || 'Limited public view').trim()
      const filterFieldId = String(body.filterFieldId || '').trim()
      const filterValue = String(body.filterValue || '').trim()
      const visibleFieldIds = Array.isArray(body.visibleFieldIds)
        ? body.visibleFieldIds.map((value: unknown) => String(value))
        : []

      if (!viewId || !filterFieldId || !filterValue || visibleFieldIds.length === 0) {
        return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
      }

      const existingView = schema.limitedPublicViews.find((view) => view.id === viewId)
      if (!existingView) {
        return NextResponse.json({ error: 'view_not_found' }, { status: 404 })
      }

      const nextSchema = withUpdatedSchema(form.schema, {
        limitedPublicViews: schema.limitedPublicViews.map((view) =>
          view.id === viewId
            ? {
                ...view,
                name: name || view.name,
                filterFieldId,
                filterValue,
                visibleFieldIds,
                updatedAt: new Date().toISOString(),
              }
            : view
        ),
      })

      await prisma.form.update({
        where: { id: formId },
        data: { schema: nextSchema as Prisma.InputJsonValue },
      })

      return NextResponse.json({
        ok: true,
        url: `/f/${form.publicId}/responses/view/${viewId}`,
      })
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

type LinkInput = {
  label: string
  values: Prisma.InputJsonValue
  hiddenFieldIds: Prisma.InputJsonValue
  expiresAt: Date | null
}

function parseLinkInput(body: Record<string, unknown>, fieldIds: string[]):
  | { ok: true; value: LinkInput }
  | { ok: false; message: string } {
  const label = String(body.label ?? '').trim()
  if (!label) return { ok: false, message: 'Give the link a label so you can tell its responses apart.' }
  if (label.length > MAX_LINK_LABEL_LENGTH) return { ok: false, message: `Labels can be at most ${MAX_LINK_LABEL_LENGTH} characters.` }

  const knownFields = new Set(fieldIds)
  const rawValues = typeof body.values === 'object' && body.values !== null && !Array.isArray(body.values)
    ? (body.values as Record<string, unknown>)
    : {}
  const values: Record<string, unknown> = {}
  for (const [fieldId, value] of Object.entries(rawValues)) {
    const empty = value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)
    if (knownFields.has(fieldId) && !empty) values[fieldId] = value
  }

  // Only prefilled questions can be hidden; a hidden question with no value would just be skipped.
  const hiddenFieldIds = Array.isArray(body.hiddenFieldIds)
    ? body.hiddenFieldIds.map(String).filter((fieldId) => fieldId in values)
    : []

  let expiresAt: Date | null = null
  if (body.expiresAt) {
    expiresAt = new Date(String(body.expiresAt))
    if (Number.isNaN(expiresAt.getTime())) return { ok: false, message: 'The expiry date is not valid.' }
  }

  return { ok: true, value: { label, values: values as Prisma.InputJsonValue, hiddenFieldIds, expiresAt } }
}

export const dynamic = 'force-dynamic'
