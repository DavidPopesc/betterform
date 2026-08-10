import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSessionUser } from "@/lib/auth-server"
import PasskeysSettings from "@/components/account/PasskeysSettings"
import StripeConnectSettings from "@/components/account/StripeConnectSettings"

export default async function AccountSettingsPage() {
  const user = await getSessionUser()
  if (!user) return redirect("/login")

  const { default: prisma } = await import("@/lib/db")
  const [passkeys, account] = await Promise.all([
    prisma.passkeyCredential.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        credentialId: true,
        transports: true,
        createdAt: true,
      },
    }),
    prisma.account.findUnique({
      where: { id: user.id },
      select: { stripeAccountId: true, stripeAccountOnboarded: true },
    }),
  ])

  return (
    <div className="min-h-svh p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Account settings</h1>
          <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        </div>

        <div className="space-y-6">
          <StripeConnectSettings
            initialStatus={{
              connected: Boolean(account?.stripeAccountId),
              onboarded: Boolean(account?.stripeAccountOnboarded),
              accountId: account?.stripeAccountId ?? null,
            }}
          />

          <PasskeysSettings
            initialPasskeys={passkeys.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
