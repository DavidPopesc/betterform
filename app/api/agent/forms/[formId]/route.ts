import { NextResponse } from 'next/server'
import { getAgentForm, getBearerToken, updateAgentForm } from '@/lib/agent-forms'

type Params = { params: Promise<{ formId: string }> }

function toResponse(result: Awaited<ReturnType<typeof getAgentForm>> | Awaited<ReturnType<typeof updateAgentForm>>) {
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message, issues: result.issues },
      { status: result.status }
    )
  }
  return NextResponse.json(result.form, { status: 'status' in result ? result.status : 200 })
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { formId } = await params
    return toResponse(await getAgentForm(formId, getBearerToken(req) ?? ''))
  } catch (err) {
    console.error('Agent form get error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// Full replacement: send the complete form definition, same shape as the create call.
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { formId } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    return toResponse(await updateAgentForm(formId, getBearerToken(req) ?? '', body))
  } catch (err) {
    console.error('Agent form update error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
