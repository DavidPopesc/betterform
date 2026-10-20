import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/form-account'
import { createAgentForm } from '@/lib/agent-forms'

// Unauthenticated: lets an LLM agent create a form on a user's behalf.
// Docs for agents live at /llms.txt; the same operations are exposed over MCP at /mcp.
export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'invalid_json', message: 'Request body must be valid JSON. See https://betterform.dev/llms.txt' },
        { status: 400 }
      )
    }

    const result = await createAgentForm(body, getClientIp(req.headers))
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message, issues: result.issues },
        { status: result.status }
      )
    }
    return NextResponse.json(result.form, { status: 201 })
  } catch (err) {
    console.error('Agent form create error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
