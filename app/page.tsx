import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  FileUp,
  Mail,
  AlertCircle,
  Download,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-svh bg-white">
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div>
              <Image src="/betterformlogo.png" alt="Better Form logo" width={24} height={24} priority />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950">Better Form</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" className="text-sm">
              <Link href="/docs/api">API Docs</Link>
            </Button>
            <Button asChild variant="ghost" className="text-sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="text-sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6">
        {/* Hero */}
        <section className="mx-auto max-w-6xl py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-slate-950">
              Forms built for the work that comes after publish
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              Better Form is a form builder that doesn't stop at submission. Manage response limits, verify emails, collect files, export data, trigger webhooks, and keep your process clean with one tool instead of five.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="text-base">
                <Link href="/signup">
                  Create a form
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href="/login">Open dashboard</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="mx-auto max-w-6xl py-16 md:py-24 border-t border-slate-200">
          <h2 className="text-3xl font-semibold text-slate-950 mb-12">What you actually get</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Builder */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700">
                <Zap className="size-4" />
                The builder
              </div>
              <h3 className="text-2xl font-semibold text-slate-950 mb-3">Clean form editor</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Short answer, paragraph, email, phone, dropdown, checkboxes, file upload, date, time, rating, linear scale</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Sections to organize longer forms</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Drag to reorder fields</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Themes for public form appearance</span>
                </li>
              </ul>
            </div>

            {/* Control */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700">
                <AlertCircle className="size-4" />
                The controls
              </div>
              <h3 className="text-2xl font-semibold text-slate-950 mb-3">Manage submissions your way</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Turn responses on or off</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Response deadline with auto-close</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Limit to one response per email address</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Require verified email for submission</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Set file type and size limits on uploads</span>
                </li>
              </ul>
            </div>

            {/* Operations */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700">
                <Download className="size-4" />
                The operations
              </div>
              <h3 className="text-2xl font-semibold text-slate-950 mb-3">After responses arrive</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>View all responses in a clean table</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Export to CSV with a click</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Get notified via email when responses arrive</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Webhook delivery for integrations</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>REST API for programmatic access</span>
                </li>
              </ul>
            </div>

            {/* Public */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700">
                <Mail className="size-4" />
                The public form
              </div>
              <h3 className="text-2xl font-semibold text-slate-950 mb-3">Share links that look right</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Multiple color themes to choose from</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Custom success messages after submit</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Shows status when responses are closed</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400">•</span>
                  <span>Clean, readable on all devices</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mx-auto max-w-6xl py-16 md:py-24 border-t border-slate-200">
          <h2 className="text-3xl font-semibold text-slate-950 mb-8">Your account, your way</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-950 mb-2">Passkey-ready</h3>
                <p className="text-sm text-slate-600">
                  Sign in with passkeys. Email fallback available if you prefer the traditional way.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-950 mb-2">Separate API keys</h3>
                <p className="text-sm text-slate-600">
                  Generate and revoke API keys independently. Use different keys for different apps.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-950 mb-2">Session management</h3>
                <p className="text-sm text-slate-600">
                  View active sessions and sign out from any device remotely.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why */}
        <section className="mx-auto max-w-6xl py-16 md:py-24 border-t border-slate-200">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold text-slate-950 mb-6">Why it's different</h2>
            <div className="space-y-4 text-slate-600">
              <p className="leading-relaxed">
                Most form tools stop after you hit publish. You get a shareable link and then you're on your own managing responses, exporting data, and finding ways to trigger the next step.
              </p>
              <p className="leading-relaxed">
                Better Form is built around what actually happens when forms are in use. Response controls keep garbage out. File uploads and verified email collection reduce manual review. Webhooks and CSV export make it easy to route submissions into your existing systems.
              </p>
              <p className="leading-relaxed">
                No dashboards full of charts pretending features are more complex than they are. No extra fees for basic things like webhooks or API access. Just a clean form builder and the controls you actually need.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl py-16 md:py-24 border-t border-slate-200">
          <div className="rounded-lg border border-slate-200 p-8 md:p-12 bg-slate-50">
            <h2 className="text-3xl font-semibold text-slate-950 mb-4">Ready to build?</h2>
            <p className="text-slate-600 mb-6 max-w-2xl">
              Create an account and start building your first form in minutes. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="text-base">
                <Link href="/signup">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href="/docs/api">View API docs</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-6 py-8 mt-16">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between text-sm text-slate-600 gap-4">
          <div>© 2026 Better Form. Built for real workflows.</div>
          <div className="flex gap-6">
            <Link href="/docs/api" className="hover:text-slate-900">API Documentation</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
