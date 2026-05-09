import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Better Form API Docs",
  description: "API documentation for Better Form submission, webhook, and data export endpoints.",
}

const codeSamples = {
  submit: `fetch("https://betterform.dev/api/submit/{publicId}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer bf_sub_your_submission_key_here"
  },
  body: JSON.stringify({
    responses: {
      field_name: "Ada Lovelace",
      field_email: "ada@example.com"
    }
  })
})`,
  webhook: `import crypto from "crypto"

function verifyWebhook(payload, signature, submissionApiKey) {
  const expected = crypto
    .createHmac("sha256", submissionApiKey)
    .update(JSON.stringify(payload))
    .digest("hex")

  return signature === expected
}`,
  data: `fetch("https://betterform.dev/api/forms/data/{dataApiKey}", {
  headers: { Accept: "application/json" }
})
  .then((res) => res.json())
  .then((data) => console.log(data.responses))`,
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.5),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="overflow-hidden border-white/80 bg-white/90 p-0 shadow-sm">
          <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Documentation</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Better Form API</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                Use Better Form as a hosted form backend: submit responses externally, receive webhook alerts, and fetch response data with separate API keys.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/signup">Create account</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Open dashboard</Link>
                </Button>
              </div>
            </div>
            <div className="bg-slate-950 p-8 text-slate-100">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Base URL</div>
                <code className="mt-3 block rounded-xl bg-black/30 px-4 py-3 text-sm">https://betterform.dev/api</code>
                <div className="mt-5 grid gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 px-4 py-3">
                    <div className="font-medium text-white">Submission key</div>
                    <div className="text-slate-300"><code>bf_sub_...</code> for external writes and webhook signatures.</div>
                  </div>
                  <div className="rounded-xl border border-white/10 px-4 py-3">
                    <div className="font-medium text-white">Data key</div>
                    <div className="text-slate-300"><code>bf_data_...</code> for read-only response exports.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-white/80 bg-white/90 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Endpoints</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-sky-700">Submit responses</div>
              <code className="mt-2 block text-sm text-slate-900">POST /submit/{`{publicId}`}</code>
              <p className="mt-3 text-sm text-slate-600">Send response payloads from your own frontend or server.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-sky-700">Webhook delivery</div>
              <code className="mt-2 block text-sm text-slate-900">POST your webhook URL</code>
              <p className="mt-3 text-sm text-slate-600">Receive real-time response notifications signed with your submission key.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-sky-700">Fetch responses</div>
              <code className="mt-2 block text-sm text-slate-900">GET /forms/data/{`{dataApiKey}`}</code>
              <p className="mt-3 text-sm text-slate-600">Export response data in JSON with lightweight rate limiting.</p>
            </div>
          </div>
        </Card>

        <Card className="border-white/80 bg-white/90 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Submission API</h2>
          <p className="mt-2 text-sm text-slate-600">
            Authenticate with <code>Authorization: Bearer {`{submissionApiKey}`}</code> and send a <code>responses</code> object keyed by field IDs.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-slate-100">{codeSamples.submit}</pre>
        </Card>

        <Card className="border-white/80 bg-white/90 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Webhook verification</h2>
          <p className="mt-2 text-sm text-slate-600">
            Better Form includes an `X-BetterForm-Signature` header for each webhook request. Verify it before trusting the payload.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-slate-100">{codeSamples.webhook}</pre>
        </Card>

        <Card className="border-white/80 bg-white/90 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Response export API</h2>
          <p className="mt-2 text-sm text-slate-600">Use the data key in the path. Responses are rate limited to one request every five seconds per form.</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-slate-100">{codeSamples.data}</pre>
        </Card>
      </div>
    </div>
  )
}
