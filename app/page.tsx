import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Check, Shield, Workflow } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getSessionUser } from '@/lib/auth-server'

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
            <Link href="/dashboard" className="mb-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">
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
    </div>
  )
}
