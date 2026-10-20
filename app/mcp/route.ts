import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/form-account'
import {
  AGENT_FIELD_TYPES,
  AGENT_THEMES,
  CLAIM_TTL_DAYS,
  MAX_FIELDS,
  MAX_OPTIONS,
  createAgentForm,
  getAgentForm,
  updateAgentForm,
} from '@/lib/agent-forms'

// Remote MCP server (Streamable HTTP transport, stateless, JSON responses only).
// Exposes the same create / read / update operations as /api/agent/forms so
// Claude, ChatGPT and coding agents can build forms as a connector at https://betterform.dev/mcp.
//
// Stateless means: no Mcp-Session-Id, no server-initiated messages, no SSE stream.
// Every POST carries one JSON-RPC message (or a batch) and gets a JSON reply.

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
const SERVER_INFO = { name: 'betterform', title: 'Better Form', version: '1.0.0' }

const SERVER_INSTRUCTIONS =
  'Better Form builds hosted forms (sign-ups, RSVPs, applications, surveys, waivers, contracts) for clubs, events and projects. ' +
  'Call create_form with the complete form, then give the user the claimUrl from the result: it opens a preview where they add ' +
  'the form to their Better Form account (signing up if needed). The form accepts responses only after it is claimed. ' +
  'Keep claimUrl private to the user. To change the form before it is claimed, call update_form with the full revised ' +
  `definition. Unclaimed forms are deleted after ${CLAIM_TTL_DAYS} days.`

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const fieldSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: AGENT_FIELD_TYPES,
      description:
        'short_text, paragraph, email, phone, date, time: plain inputs. ' +
        'multiple_choice (pick one, radios), dropdown (pick one, long lists), checkboxes (pick any): need `options`. ' +
        'scale: rating, see scaleStyle/scaleMax. file_upload: see maxFiles/allowedFileTypes. ' +
        'text: static heading (label) and paragraph (description), no input. section: page break. ' +
        'legal_text: contract/waiver terms, needs `content`. signature: signature pad (adds a required verified email field automatically).',
    },
    label: { type: 'string', description: 'Question text. Required except for text and section.' },
    description: { type: 'string', description: 'Optional help text under the label (the body for `text` fields).' },
    required: { type: 'boolean' },
    options: {
      type: 'array',
      items: { type: 'string' },
      maxItems: MAX_OPTIONS,
      description: 'Choices for multiple_choice, dropdown and checkboxes.',
    },
    scaleStyle: { type: 'string', enum: ['numbers', 'stars', 'faces'], description: 'scale only. Default numbers.' },
    scaleMax: { type: 'integer', minimum: 2, maximum: 5, description: 'scale only. Default 5.' },
    maxFiles: { type: 'integer', minimum: 1, maximum: 10, description: 'file_upload only. Default 1.' },
    allowedFileTypes: {
      type: 'array',
      items: { type: 'string' },
      description: 'file_upload only, e.g. ["image/*", ".pdf"]. Omit to allow any file.',
    },
    content: { type: 'string', description: 'legal_text only: the full contract or waiver text.' },
    signatureMode: { type: 'string', enum: ['draw', 'type', 'either'], description: 'signature only. Default either.' },
    id: { type: 'string', description: 'Optional stable id ([A-Za-z0-9_-]). Omit to have one generated.' },
  },
  required: ['type'],
}

const formDefinitionProperties = {
  name: { type: 'string', description: 'Form title (max 200 characters).' },
  fields: {
    type: 'array',
    items: fieldSchema,
    minItems: 1,
    maxItems: MAX_FIELDS,
    description: 'Fields in display order.',
  },
  theme: { type: 'string', enum: AGENT_THEMES, description: 'Color theme. Default blue.' },
  successMessage: { type: 'string', description: 'Shown after someone submits (max 500 characters).' },
}

const formResultSchema = {
  type: 'object',
  properties: {
    formId: { type: 'string' },
    name: { type: 'string' },
    previewUrl: { type: 'string', description: 'Read-only preview, safe to share.' },
    claimUrl: { type: 'string', description: 'Give this to the user. Anyone with it can claim the form.' },
    editToken: { type: 'string', description: 'Pass to update_form / get_form.' },
    expiresAt: { type: 'string' },
    fields: { type: 'array' },
  },
  required: ['formId', 'previewUrl'],
}

const TOOLS = [
  {
    name: 'create_form',
    title: 'Create form',
    description:
      'Create a Better Form form for the user (no account needed). Returns a claimUrl to give the user: it shows a preview ' +
      'and lets them add the form to their account, after which it can be edited, shared and starts accepting responses. ' +
      'Payments, quizzes, deadlines and response limits are configured by the user in the editor after claiming.',
    inputSchema: {
      type: 'object',
      properties: formDefinitionProperties,
      required: ['name', 'fields'],
    },
    outputSchema: formResultSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'update_form',
    title: 'Update form',
    description:
      'Replace an unclaimed form with a revised definition (send every field, not just the changes). ' +
      'The claimUrl stays the same. Fails once the user has claimed the form.',
    inputSchema: {
      type: 'object',
      properties: {
        formId: { type: 'string' },
        editToken: { type: 'string', description: 'From create_form.' },
        ...formDefinitionProperties,
      },
      required: ['formId', 'editToken', 'name', 'fields'],
    },
    outputSchema: formResultSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'get_form',
    title: 'Get form',
    description: 'Fetch the current definition of an unclaimed form created with create_form.',
    inputSchema: {
      type: 'object',
      properties: {
        formId: { type: 'string' },
        editToken: { type: 'string', description: 'From create_form.' },
      },
      required: ['formId', 'editToken'],
    },
    outputSchema: formResultSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
]

// ---------------------------------------------------------------------------
// JSON-RPC handling
// ---------------------------------------------------------------------------

type JsonRpcId = string | number | null
type JsonRpcMessage = { jsonrpc?: string; id?: JsonRpcId; method?: string; params?: Record<string, unknown> }

class RpcError extends Error {
  constructor(public code: number, message: string) {
    super(message)
  }
}

function toolResult(result: Awaited<ReturnType<typeof getAgentForm>> | Awaited<ReturnType<typeof createAgentForm>>, summary: (form: Record<string, unknown>) => string) {
  // Failures are reported as tool results (isError) rather than protocol errors so the model can read them and retry.
  if (!result.ok) {
    return { content: [{ type: 'text', text: result.message }], isError: true }
  }
  const form = result.form as Record<string, unknown>
  return {
    content: [
      { type: 'text', text: summary(form) },
      { type: 'text', text: JSON.stringify(form, null, 2) },
    ],
    structuredContent: form,
  }
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (typeof value !== 'string' || !value) throw new RpcError(-32602, `Missing or invalid argument: ${key}`)
  return value
}

async function callTool(name: unknown, args: Record<string, unknown>, clientIp: string) {
  switch (name) {
    case 'create_form':
      return toolResult(
        await createAgentForm(args, clientIp),
        (form) =>
          `Created "${form.name}". Give the user this link to preview the form and add it to their account: ${form.claimUrl}\n` +
          `Keep it private to them. To make changes first, call update_form with formId and editToken.`
      )
    case 'update_form': {
      // parseAgentFormInput ignores unknown keys, so formId/editToken can ride along in the definition.
      return toolResult(
        await updateAgentForm(stringArg(args, 'formId'), stringArg(args, 'editToken'), args),
        (form) => `Updated "${form.name}". The user's claim link is unchanged.`
      )
    }
    case 'get_form':
      return toolResult(
        await getAgentForm(stringArg(args, 'formId'), stringArg(args, 'editToken')),
        (form) => `Current definition of "${form.name}":`
      )
    default:
      throw new RpcError(-32602, `Unknown tool: ${String(name)}`)
  }
}

async function handleRequest(message: JsonRpcMessage, clientIp: string): Promise<unknown> {
  const params = message.params ?? {}
  switch (message.method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
      return {
        protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      }
    }
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: TOOLS }
    case 'tools/call': {
      const args = params.arguments
      return callTool(params.name, typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {}, clientIp)
    }
    default:
      throw new RpcError(-32601, `Method not found: ${message.method}`)
  }
}

async function handleMessage(message: unknown, clientIp: string) {
  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }
  }
  const msg = message as JsonRpcMessage
  const isRequest = msg.id !== undefined && msg.id !== null && typeof msg.method === 'string'

  // Notifications (e.g. notifications/initialized) and client responses need no reply.
  if (!isRequest) return null

  try {
    return { jsonrpc: '2.0', id: msg.id, result: await handleRequest(msg, clientIp) }
  } catch (err) {
    if (err instanceof RpcError) {
      return { jsonrpc: '2.0', id: msg.id, error: { code: err.code, message: err.message } }
    }
    console.error('MCP request error:', err)
    return { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: 'Internal error' } }
  }
}

// No cookies or credentials are involved, so any origin may call this (e.g. browser-based MCP clients).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const clientIp = getClientIp(req.headers)

  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map((message) => handleMessage(message, clientIp)))).filter(Boolean)
    return replies.length > 0
      ? NextResponse.json(replies, { headers: CORS_HEADERS })
      : new Response(null, { status: 202, headers: CORS_HEADERS })
  }

  const reply = await handleMessage(body, clientIp)
  return reply
    ? NextResponse.json(reply, { headers: CORS_HEADERS })
    : new Response(null, { status: 202, headers: CORS_HEADERS })
}

// This server never pushes messages, so there is no SSE stream to open.
export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { ...CORS_HEADERS, Allow: 'POST, OPTIONS' } })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export const dynamic = 'force-dynamic'
