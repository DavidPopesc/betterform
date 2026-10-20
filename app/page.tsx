import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Check, Shield, Sparkles, Workflow } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getSessionUser } from '@/lib/auth-server'

const SITE_URL = 'https://www.betterform.dev'
const LLMS_TXT_URL = `${SITE_URL}/llms.txt`

// Kept in sync with the first example in public/llms.txt (tests/form-link.test.ts checks both).
const EXAMPLE_FORM_PATH =
  '/new#title=Book+Club+Sign-up&q=short_text*:Your+name&q=email*:Email&q=multiple_choice:Which+meeting+works%3F&o=Tuesday&o=Thursday'

// The description, the llms.txt link and the JSON-LD below are what AI assistants see when they
// search for or open the site, so they say up front that an assistant can build a form here.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  description:
    'Forms for clubs, events and projects: sign-ups, RSVPs, applications, waivers and contracts. ' +
    'AI assistants can create a complete Better Form as a shareable URL; instructions at https://www.betterform.dev/llms.txt',
  alternates: { types: { 'text/plain': [{ url: '/llms.txt', title: 'AI Agent Instructions' }] } },
  // Nonstandard hint; the alternate link above and the visible section are the real discovery paths.
  other: {
    'ai-capabilities': `Create complete forms through URLs, MCP, or HTTP API. Documentation: ${LLMS_TXT_URL}`,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Better Form',
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Online form builder for sign-ups, RSVPs, applications, surveys, waivers and contracts, with file uploads, ' +
    'verified email, webhooks and exports. AI assistants can create a complete form as a URL, through an MCP server, or through an HTTP API.',
  featureList: [
    'Form builder',
    'File uploads',
    'Verified email',
    'Webhooks and exports',
    'AI-assisted form creation through URLs, MCP and an HTTP API',
  ],
  softwareHelp: [
    { '@type': 'CreativeWork', name: 'AI agent instructions', url: LLMS_TXT_URL },
    { '@type': 'CreativeWork', name: 'API documentation', url: `${SITE_URL}/docs/api` },
  ],
}

export default async function Home() {
  const user = await getSessionUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)] px-6">
      <main className="mx-auto flex min-h-svh max-w-6xl items-center">
        <div className="grid w-full gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Link href="/dashboard" className="mx-auto mb-6 inline-flex items-center gap-3">
              <Image src="/betterformlogo.png" alt="Better Form logo" width={32} height={32} />
              <span className="text-sm font-medium text-slate-700">Better Form</span>
            </Link>

            <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              A better place to create and manage your forms.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Build clean forms, collect files, verify respondents, and manage responses without the usual mess.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="text-base">
                <Link href="/signup">
                  Create an account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-base">
                <Link href="/docs/api">API Docs</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2">
                <Check className="size-4 text-slate-500" />
                File uploads
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2">
                <Shield className="size-4 text-slate-500" />
                Verified email
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2">
                <Workflow className="size-4 text-slate-500" />
                Webhooks and exports
              </div>
            </div>
          </div>

          <Card className="border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/50">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Better Form
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">
                    Intake that actually stays organized
                  </div>
                </div>
                <Link href="/dashboard" aria-label="Open dashboard">
                  <Image src="/betterformlogo.png" alt="Better Form logo" width={40} height={40} />
                </Link>
              </div>

              <div className="space-y-3">
                {[
                  'Build once, share anywhere',
                  'Pre-fill links for private workflows',
                  'Exports, files, and response controls included',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                    <Check className="size-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </main>

      <section aria-labelledby="ai-forms-heading" className="mx-auto max-w-6xl pb-12">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-6">
          <h2 id="ai-forms-heading" className="flex items-center gap-2 text-base font-semibold text-slate-950">
            <Sparkles className="size-4 text-slate-500" aria-hidden="true" />
            Create forms with AI
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            ChatGPT, Claude and other AI assistants can build a complete Better Form for you as a link. No account or
            API key is needed to generate the preview; add the form to your account when it looks right.
          </p>
          <code className="mt-4 block break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
            {`https://betterform.dev${EXAMPLE_FORM_PATH}`}
          </code>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a href={EXAMPLE_FORM_PATH} className="font-medium text-slate-900 underline underline-offset-4">
              Try this example
            </a>
            <a href="/llms.txt" className="font-medium text-slate-900 underline underline-offset-4">
              AI integration documentation
            </a>
            <span className="text-slate-500">Assistants with tools can also use the MCP server or the HTTP API.</span>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </div>
  )
}
