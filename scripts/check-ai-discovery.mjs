// Checks that a running Better Form deployment is discoverable by AI assistants and that every
// form example in public/llms.txt is accepted by the app's own validator. Stores nothing.
//
//   npm run check:ai -- http://localhost:3000
//   npm run check:ai -- https://www.betterform.dev
import { readFileSync } from 'node:fs'
import { decodeFormLink } from '../lib/form-link.ts'

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '')
const llmsTxt = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8')

let failures = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${!ok && detail ? ` (${detail})` : ''}`)
  if (!ok) failures++
}

async function get(path) {
  const res = await fetch(base + path, { redirect: 'follow' })
  return { res, body: await res.text() }
}

// Homepage: everything must be in the server-rendered HTML, no JavaScript required.
const home = await get('/')
check('homepage returns 200', home.res.status === 200, `got ${home.res.status}`)
const alternateLinks = home.body.match(/<link rel="alternate"[^>]*>/g) ?? []
check(
  'homepage head links llms.txt as text/plain',
  alternateLinks.some((tag) => tag.includes('type="text/plain"') && /href="[^"]*\/llms\.txt"/.test(tag))
)
check('meta description mentions AI-created forms', /<meta name="description" content="[^"]*AI assistants[^"]*"/.test(home.body))
check('ai-capabilities meta tag present', /<meta name="ai-capabilities" content="[^"]*llms\.txt"/.test(home.body))
check('visible "Create forms with AI" section is server-rendered', home.body.includes('Create forms with AI'))
check('homepage body links to /llms.txt', home.body.includes('href="/llms.txt"'))

const jsonLdMatch = home.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)
let jsonLd = null
try {
  jsonLd = jsonLdMatch && JSON.parse(jsonLdMatch[1])
} catch {}
check('JSON-LD parses as a schema.org WebApplication', jsonLd?.['@context'] === 'https://schema.org' && jsonLd?.['@type'] === 'WebApplication')

// Docs and crawl rules.
const docs = await get('/llms.txt')
check('/llms.txt returns 200', docs.res.status === 200, `got ${docs.res.status}`)
check('/llms.txt is text/plain', (docs.res.headers.get('content-type') || '').startsWith('text/plain'))

const robots = await get('/robots.txt')
const disallowed = [...robots.body.matchAll(/^Disallow:\s*(\S+)/gim)].map((match) => match[1])
for (const path of ['/', '/llms.txt', '/new', '/mcp', '/api/agent/forms']) {
  const blockedBy = disallowed.find((rule) => rule !== '' && path.startsWith(rule))
  check(`robots.txt allows ${path}`, !blockedBy, `blocked by Disallow: ${blockedBy}`)
}

// Every documented example must pass the real validator (POST /api/agent/forms/validate stores nothing).
async function validate(name, definition) {
  const res = await fetch(`${base}/api/agent/forms/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
  })
  const body = await res.json().catch(() => ({}))
  check(name, res.status === 200, JSON.stringify(body.issues ?? body).slice(0, 300))
}

const links = [...llmsTxt.matchAll(/https:\/\/betterform\.dev\/new#[^\s`"]+/g)]
  .map((match) => match[0])
  .filter((link) => !link.includes('…') && !link.includes('{'))
for (const link of links) {
  const decoded = await decodeFormLink(new URL(link).hash)
  if (!decoded.ok) {
    check(`example link decodes: ${link.slice(0, 70)}…`, false, decoded.message)
    continue
  }
  await validate(`example link is valid: "${decoded.definition.name}"`, decoded.definition)
}

const curlExample = llmsTxt.match(/-d '(\{[\s\S]*?\})'/)
check('llms.txt HTTP API example found', !!curlExample)
if (curlExample) await validate('HTTP API example is valid', JSON.parse(curlExample[1]))

const firstLink = links[0] ? new URL(links[0]) : null
if (firstLink) {
  const page = await get(`/new${firstLink.search}`)
  check('/new page loads', page.res.status === 200, `got ${page.res.status}`)
}

console.log(failures ? `\n${failures} check(s) failed against ${base}` : `\nAll checks passed against ${base}`)
process.exit(failures ? 1 : 0)
