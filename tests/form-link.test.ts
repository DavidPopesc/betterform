// Run with `npm test` (Node's built-in runner, no dependencies). Checks that the form links
// documented for AI assistants actually decode to the forms they describe.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { decodeFormLink } from '../lib/form-link.ts'

const llmsTxt = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8')
const homePage = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')

type Field = { type: string; label: string; required?: boolean; options?: string[] }

async function decode(link: string) {
  const result = await decodeFormLink(link)
  assert.ok(result.ok, `expected ${link} to decode, got: ${result.ok ? '' : result.message}`)
  return result.definition as { name?: string; fields: Field[] }
}

// Complete example links only; skips placeholders like `/new#…` and `/new#z={z}`.
function documentedLinks() {
  return [...llmsTxt.matchAll(/https:\/\/betterform\.dev\/new#[^\s`"]+/g)]
    .map((match) => match[0])
    .filter((link) => !link.includes('…') && !link.includes('{'))
}

test('llms.txt documents at least two form links', () => {
  assert.ok(documentedLinks().length >= 2)
})

test('every documented form link decodes to a titled form with fields', async () => {
  for (const link of documentedLinks()) {
    const definition = await decode(new URL(link).hash)
    assert.ok(definition.name, `${link} has no title`)
    assert.ok(definition.fields.length > 0, `${link} has no fields`)
  }
})

test('the homepage example matches the first llms.txt example and prepopulates the expected fields', async () => {
  const homeExample = homePage.match(/'(\/new#[^']+)'/)?.[1]
  assert.ok(homeExample, 'EXAMPLE_FORM_PATH not found in app/page.tsx')
  assert.equal(`https://betterform.dev${homeExample}`, documentedLinks()[0])

  const definition = await decode(new URL(homeExample, 'https://betterform.dev').hash)
  assert.equal(definition.name, 'Book Club Sign-up')
  assert.deepEqual(definition.fields, [
    { type: 'short_text', label: 'Your name', required: true },
    { type: 'email', label: 'Email', required: true },
    { type: 'multiple_choice', label: 'Which meeting works?', options: ['Tuesday', 'Thursday'] },
  ])
})

test('query-string links and guessed type names work', async () => {
  const definition = await decode('?title=Club&q=short-answer*:Name&q=radio:Pick&o=A&o=B&q=Long+Answer:Why')
  assert.deepEqual(
    definition.fields.map((field) => field.type),
    ['short_text', 'multiple_choice', 'paragraph']
  )
})

test('labels may contain colons', async () => {
  const definition = await decode('#title=RSVP&q=time:Arrival:+approx')
  assert.equal(definition.fields[0].label, 'Arrival: approx')
})

test('base64 and compressed JSON links decode', async () => {
  const form = { name: 'Bake Sale', fields: [{ type: 'short_text', label: 'Name' }] }
  const json = Buffer.from(JSON.stringify(form))
  const { deflateRawSync } = await import('node:zlib')
  assert.deepEqual(await decode(`#j=${json.toString('base64url')}`), form)
  assert.deepEqual(await decode(`#z=${deflateRawSync(json).toString('base64url')}`), form)
})

test('broken links fail with a readable message', async () => {
  for (const link of ['', '#j=eyJuYW1lIjoiQmFr', '#title=X&o=A']) {
    const result = await decodeFormLink(link)
    assert.equal(result.ok, false)
    assert.ok(!result.ok && result.message.length > 0)
  }
})
