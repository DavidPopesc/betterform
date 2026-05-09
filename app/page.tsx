import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  ChartColumnBig,
  FileUp,
  KeyRound,
  Layers3,
  LockKeyhole,
  MailCheck,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Layers3,
    title: "A form builder that stays out of your way",
    description:
      "Build intake forms, quizzes, RSVPs, and application flows with sections, verified fields, response limits, and clean editing controls.",
  },
  {
    icon: MailCheck,
    title: "Better verification built in",
    description:
      "Use verified email collection, one-response limits, and passkey-first account access without bolting on a separate auth product.",
  },
  {
    icon: Workflow,
    title: "From share link to webhook",
    description:
      "Publish forms fast, collect responses, trigger webhooks, export data, and plug Better Form into the systems you already run.",
  },
]

const capabilityRows = [
  {
    eyebrow: "Collect",
    title: "Capture serious responses, not just pretty inputs",
    body:
      "Short answer, paragraph, dropdowns, checkboxes, dates, ratings, quizzes, verified email prompts, and file uploads with type and size rules.",
    icon: FileUp,
  },
  {
    eyebrow: "Control",
    title: "Decide exactly how submissions are allowed",
    body:
      "Turn responses on or off, add deadlines, limit by email or user, and shape the submission experience around the kind of data you actually need.",
    icon: Radar,
  },
  {
    eyebrow: "Operate",
    title: "Built for the part after publish",
    body:
      "Response views, CSV export, submission alert emails, API keys, webhook delivery, and public forms that still feel branded and trustworthy.",
    icon: ChartColumnBig,
  },
]

const trustPills = [
  "Passkey-ready accounts",
  "Verified email collection",
  "Webhook notifications",
  "CSV export",
  "API docs included",
  "File uploads with limits",
]

export default function Home() {
  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.52),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(196,181,253,0.2),_transparent_20%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_45%,#ffffff_100%)]">
      <header className="px-6 pt-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-2.5 shadow-sm">
              <Image src="/betterformlogo.png" alt="Better Form logo" width={28} height={28} priority />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950">Better Form</div>
              <div className="text-xs text-slate-500">Forms that feel production-ready</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost">
              <Link href="/docs/api">API Docs</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 pb-20 pt-8">
        <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-sm font-medium text-sky-900 shadow-sm">
              <Sparkles className="size-4" />
              Better Form is built for forms you actually want to publish
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                Build forms that look sharp, collect serious data, and feel ready on day one.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Better Form gives you a clean builder, stronger response controls, verified collection flows, file uploads, webhooks, exports, and public forms that do not feel like an afterthought.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 rounded-full px-6 text-sm font-semibold shadow-sm">
                <Link href="/signup">
                  Start building
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6 text-sm font-semibold bg-white/80">
                <Link href="/login">Open dashboard</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {trustPills.map((pill) => (
                <div
                  key={pill}
                  className="rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-sm text-slate-700 shadow-sm"
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-white/80 bg-white/88 py-0 shadow-xl backdrop-blur">
            <CardContent className="p-0">
              <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Better Form</p>
                    <h2 className="mt-2 text-2xl font-semibold">Product snapshot</h2>
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
                    Live-ready workflows
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Response controls</div>
                      <div className="text-sm text-slate-500">Deadlines, one-response rules, verified email checks</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <FileUp className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">File uploads</div>
                      <div className="text-sm text-slate-500">Allowed file types, file counts, sane limits</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                      <Workflow className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">API + webhooks</div>
                      <div className="text-sm text-slate-500">Submit externally, fetch data, trigger downstream flows</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                      <KeyRound className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Passkey-first auth</div>
                      <div className="text-sm text-slate-500">Modern account access with email fallback flows</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 p-5">
                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Why teams like it</div>
                      <div className="text-sm text-slate-500">Cleaner than patching together six separate tools</div>
                    </div>
                    <BadgeCheck className="size-5 text-sky-700" />
                  </div>

                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <LockKeyhole className="mt-0.5 size-4 text-slate-400" />
                      <span>Public forms look polished while still supporting stricter collection flows.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Workflow className="mt-0.5 size-4 text-slate-400" />
                      <span>Response handling keeps going after publish with exports, alerts, and webhook delivery.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MailCheck className="mt-0.5 size-4 text-slate-400" />
                      <span>Verified email collection helps reduce junk and duplicate submissions.</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto mt-20 max-w-6xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Built around the real workflow</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Everything Better Form is supposed to be
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Better Form is not just a builder. It is the part where your forms get shared, trusted, submitted, reviewed, exported, and turned into useful work.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="rounded-[1.75rem] border-white/80 bg-white/88 py-0 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="mb-5 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="mx-auto mt-20 grid max-w-6xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-slate-950 py-0 text-white shadow-lg">
            <CardContent className="p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Why it feels different</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                You can ship something serious without making it feel heavy.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Better Form keeps the visual layer calm and the operational layer strong. That means fewer gimmicks, cleaner public pages, and more confidence once real submissions start coming in.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/10 p-2">
                      <BadgeCheck className="size-5 text-sky-300" />
                    </div>
                    <div>
                      <div className="font-medium">Looks clean in public</div>
                      <div className="text-sm text-slate-300">Branded form pages, custom success states, and better first impressions.</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/10 p-2">
                      <ShieldCheck className="size-5 text-sky-300" />
                    </div>
                    <div>
                      <div className="font-medium">Collect with guardrails</div>
                      <div className="text-sm text-slate-300">Deadlines, file rules, verified emails, and response restrictions all live in one place.</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/10 p-2">
                      <Workflow className="size-5 text-sky-300" />
                    </div>
                    <div>
                      <div className="font-medium">Own the next step</div>
                      <div className="text-sm text-slate-300">Better Form does not stop at submit. It helps you route what happens next.</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {capabilityRows.map((row) => {
              const Icon = row.icon
              return (
                <Card key={row.title} className="rounded-[1.75rem] border-white/80 bg-white/88 py-0 shadow-sm">
                  <CardContent className="flex gap-5 p-6">
                    <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                      <Icon className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">{row.eyebrow}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{row.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{row.body}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-6xl">
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/92 py-0 shadow-lg">
            <CardContent className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Start with the good version</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                  Make your next form feel like a product, not a temporary workaround.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                  If you want a form tool that looks sharp, captures cleaner submissions, and keeps the operational details in reach, Better Form is exactly what it sounds like.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:min-w-52">
                <Button asChild size="lg" className="h-11 rounded-full px-6 text-sm font-semibold">
                  <Link href="/signup">
                    Create account
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6 text-sm font-semibold">
                  <Link href="/docs/api">Read API docs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
