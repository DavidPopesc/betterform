import Image from "next/image";
import { LoginForm } from "@/components/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <Image src="/betterformlogo.png" width={24} height={24} alt="Better Form Logo" />
          Better Form
        </Link>
        <LoginForm />
      </div>
    </div>
  )
}