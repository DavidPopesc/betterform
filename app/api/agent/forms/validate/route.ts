import { NextResponse } from 'next/server'
import { parseAgentFormInput } from '@/lib/agent-forms'

// Validates a form definition decoded from a /new#… link so the page can preview it.
// Stores nothing.
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = parseAgentFormInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: 'validation_failed', issues: parsed.errors }, { status: 422 })
  }
  return NextResponse.json({ form: parsed.value })
}
