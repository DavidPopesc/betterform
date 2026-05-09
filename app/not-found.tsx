import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.5),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-6">
      <Card className="w-full max-w-2xl overflow-hidden border-white/80 bg-white/90 p-0 shadow-xl">
        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 md:p-10">
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
              <Image src="/betterformlogo.png" alt="Better Form logo" width={24} height={24} />
              Better Form
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">404</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">This page went missing.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">
              The link may be outdated, the form may have been removed, or the route was never there to begin with.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/">Go home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </div>
          <div className="flex min-h-[260px] items-center justify-center bg-slate-950 p-8 text-white">
            <div className="w-full max-w-xs rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Better Form</div>
              <div className="mt-4 rounded-2xl bg-white p-5 text-slate-900 shadow-lg">
                <div className="mb-3 h-3 w-24 rounded-full bg-slate-200" />
                <div className="mb-2 h-2 rounded-full bg-slate-100" />
                <div className="mb-2 h-2 w-5/6 rounded-full bg-slate-100" />
                <div className="mb-6 h-2 w-2/3 rounded-full bg-slate-100" />
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
                  Page not found
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
