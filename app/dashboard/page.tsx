import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import CreateFormButton from '@/components/create-form-button'
import SignOutButton from '@/components/sign-out-button'
import { getSessionUser } from '@/lib/auth-server'
import DashboardClient from '@/components/dashboard-client'

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) return redirect("/login")

  const { default: prisma } = await import('@/lib/db')
  const forms = await prisma.form.findMany({ where: { accountId: user.id }, orderBy: { updatedAt: 'desc' }, take: 24 })

  return (
    <div className="min-h-svh p-8">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-4">
            <Image src="/betterformlogo.png" width={40} height={40} alt="Better Form logo" />
            <div className="text-3xl font-semibold">Better Form</div>
          </Link>
          <div className="hidden md:block text-sm text-muted-foreground">Start, edit, and view your forms</div>
        </div>
        <div className="flex items-center gap-3">
          <input
            placeholder="Search forms..."
            id="search-input"
            className="hidden sm:block rounded-md border px-3 py-2 text-sm shadow-sm"
          />
          <SignOutButton />
          <CreateFormButton label="Create" />
        </div>
      </header>

      <DashboardClient forms={forms} searchInputId="search-input" />
    </div>
  )
}
