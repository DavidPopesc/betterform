import { notFound } from 'next/navigation'
import PublicForm from '@/components/PublicForm'

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const { publicId } = await params

  const { default: prisma } = await import('@/lib/db')
  const form = await prisma.form.findUnique({
    where: { publicId },
    select: {
      id: true,
      name: true,
      schema: true,
      theme: true,
      isQuiz: true,
      showScore: true,
      responsesEnabled: true,
      responseDeadline: true,
      successMessage: true,
      oneResponsePerUser: true,
    },
  })

  if (!form) {
    notFound()
  }

  // Check if form is closed
  const isClosed = !form.responsesEnabled || (form.responseDeadline ? new Date() > new Date(form.responseDeadline) : false)
  
  let alreadySubmitted = false
  let closedReason = 'This form is not accepting responses.'
  
  // Check if user already submitted (oneResponsePerUser)
  if (!isClosed && form.oneResponsePerUser) {
    const { getOrCreateFormAccountId, hasFormAccountSubmitted } = await import('@/lib/form-account')
    const formAccountId = await getOrCreateFormAccountId()
    alreadySubmitted = await hasFormAccountSubmitted(formAccountId, form.id)
    
    if (alreadySubmitted) {
      closedReason = 'You have already submitted a response to this form.'
    }
  }
  
  if (!isClosed && !alreadySubmitted) {
    // Update form account tracking for view
    const { getOrCreateFormAccountId, updateFormAccountTracking, getClientIp, getDeviceMetrics } = await import('@/lib/form-account')
    const { headers } = await import('next/headers')
    const formAccountId = await getOrCreateFormAccountId()
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const deviceMetrics = getDeviceMetrics(headersList)
    
    await updateFormAccountTracking(formAccountId, {
      ip,
      deviceMetrics,
      formViewed: form.id,
    }).catch(() => {}) // Silently fail tracking
  }
  
  const finalClosed = isClosed || alreadySubmitted
  
  if (!form.responsesEnabled) {
    closedReason = 'This form is not accepting responses.'
  } else if (form.responseDeadline && new Date() > new Date(form.responseDeadline)) {
    closedReason = 'The response deadline has passed. This form is no longer accepting submissions.'
  }
  
  const schema = form.schema as { fields?: Array<Record<string, unknown>> }
  // Don't send fields to client if form is closed; type assertion safe as schema validation happens at form creation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields = (finalClosed ? [] : (schema.fields || [])) as any[]
  const theme = form.theme ?? 'slate'

  return (
    <PublicForm 
      publicId={publicId} 
      formName={form.name || 'Untitled form'} 
      fields={fields}
      theme={theme}
      isQuiz={form.isQuiz ?? false}
      showScore={form.showScore ?? false}
      isClosed={finalClosed}
      closedReason={closedReason}
      successMessage={form.successMessage ?? 'Your response has been recorded.'}
    />
  )
}

export const dynamic = 'force-dynamic'
