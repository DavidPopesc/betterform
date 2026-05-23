import { redirect } from 'next/navigation'

export default async function LegacySharedResponsesPage({
  params,
}: {
  params: Promise<{ viewId: string }>
}) {
  const { viewId } = await params
  redirect(`/responses/view/${viewId}`)
}

export const dynamic = 'force-dynamic'
