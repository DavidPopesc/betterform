import Image from "next/image"
import { SignupForm } from "@/components/signup-form"
import  Link  from "next/link"

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 self-center font-medium">
          <Image src="/betterformlogo.png" width={24} height={24} alt="Better Form Logo" />
          Better Form
        </Link>
        <SignupForm />
      </div>
      
      <footer className="mt-8 text-center text-xs text-slate-600 flex gap-4">
        <Link href="/terms" className="hover:text-slate-900">Terms</Link>
        <span>•</span>
        <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
      </footer>
    </div>
  )
}
