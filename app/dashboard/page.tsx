import { cookies } from "next/headers"
import prisma from "@/lib/db"
import crypto from "crypto"
import { redirect } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export default async function DashboardPage() {
  const cookieStore = (await Promise.resolve(cookies() as any)) as any
  const token = cookieStore.get?.("bf_session")?.value
  if (!token) return redirect("/login")

  const tokenHash = sha256Hex(token)
  const session = await prisma.session.findFirst({ where: { tokenHash, revoked: false }, include: { user: true } })
  if (!session || (session.expiresAt && session.expiresAt < new Date())) return redirect("/login")

  const user = session.user

  const templates = [
    { title: "Assessment", color: "bg-amber-100" },
    { title: "Exit Ticket", color: "bg-emerald-100" },
    { title: "Contact Information", color: "bg-lime-100" },
    { title: "RSVP", color: "bg-rose-100" },
  ]

  const recent = [
    { title: "Untitled form", meta: "Opened 11:56 AM" },
    { title: "Untitled form", meta: "Opened 11:49 AM" },
    { title: "Chess Tournament", meta: "Apr 20, 2023" },
    { title: "TSA Official Point Log", meta: "Oct 25, 2022" },
    { title: "Survey", meta: "Mar 3, 2024" },
    { title: "Event RSVP", meta: "Jan 7, 2024" },
  ]

  return (
    <div className="min-h-svh p-8">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-semibold">Forms</div>
          <div className="hidden md:block text-sm text-muted-foreground">Start, edit, and view your forms</div>
        </div>
        <div className="flex items-center gap-3">
          <input
            placeholder="Search"
            className="hidden sm:block rounded-md border px-3 py-2 text-sm shadow-sm"
          />
          <Button variant="outline">Create</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-medium">Start a new form</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto py-2">
            <Card className="min-w-[220px] max-w-[220px] shrink-0 flex-col items-start justify-between p-4">
              <div className="flex w-full items-start gap-3">
                <div className="h-20 w-20 rounded-md bg-gradient-to-br from-sky-300 to-indigo-400 flex items-center justify-center text-white text-2xl overflow-hidden">+</div>
                <div className="flex-1">
                  <h3 className="font-semibold">Blank form</h3>
                  <p className="text-sm text-muted-foreground mt-1">Create a form from scratch</p>
                </div>
              </div>
              <div className="w-full flex justify-end mt-3">
                <Button size="sm">Start</Button>
              </div>
            </Card>

            {templates.map((t) => (
              <Card key={t.title} className="min-w-[220px] max-w-[220px] shrink-0 p-0 overflow-hidden">
                <div className={`${t.color} h-28 w-full`} />
                <div className="p-4">
                  <div className="font-semibold">{t.title}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent forms</h2>
            <div className="text-sm text-muted-foreground">Owned by anyone ▾</div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recent.map((r) => (
              <Card key={r.title} className="p-0 overflow-hidden">
                <div className="h-40 w-full bg-gradient-to-br from-white to-slate-100 overflow-hidden" />
                <div className="p-4">
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{r.meta}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
