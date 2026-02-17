import { verifyEmailToken } from "@/lib/email"

import Link from "next/link"

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ t?: string; uid?: string }> | { t?: string; uid?: string } }) {
  const params = (await searchParams) as { t?: string; uid?: string }
  const token = params.t
  const uid = params.uid

  if (!token || !uid) {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Invalid verification link</h1>
          <p className="mt-2">The verification link is missing required parameters.</p>
        </div>
      </div>
    )
  }

  const result = await verifyEmailToken(uid, token)

  return (
    <div className="min-h-svh flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        {result.ok ? (
          <>
            <h1 className="text-xl font-semibold">Email verified</h1>
            <p className="mt-2">Thank you — your email address has been verified.</p>
            <Link href="/login" className="mt-4 inline-block text-sm underline-offset-4 hover:underline"> Sign in</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Verification failed</h1>
            <p className="mt-2">{result.reason === "expired" ? "This link has expired." : result.reason === "used" ? "This link has already been used." : "The link is invalid."}</p>
          </>
        )}
      </div>
    </div>
  )
}
