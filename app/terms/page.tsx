import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  return (
    <div className="min-h-svh bg-white">
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
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

      <main className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold text-slate-950 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-600 mb-8">Last updated: May 2026</p>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Better Form ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials (information or software) on Better Form for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for any commercial purpose or for any public display</li>
                <li>Attempting to decompile or reverse engineer any software contained on Better Form</li>
                <li>Removing any copyright or other proprietary notations from the materials</li>
                <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">3. Disclaimer</h2>
              <p>
                The materials on Better Form are provided on an 'as is' basis. Better Form makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">4. Limitations</h2>
              <p>
                In no event shall Better Form or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Better Form.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">5. Accuracy of Materials</h2>
              <p>
                The materials appearing on Better Form could include technical, typographical, or photographic errors. Better Form does not warrant that any of the materials on the Service are accurate, complete, or current. Better Form may make changes to the materials contained on its website at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">6. Materials and Content</h2>
              <p>
                You are responsible for all content that you submit, publish, or display on Better Form. By submitting content, you grant Better Form a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute such content in connection with the Service.
              </p>
              <p className="mt-3">
                You warrant that you own or have the necessary rights to the content you submit and that such content does not violate any third-party rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">7. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account information and password. You agree to accept responsibility for all activities that occur under your account. You must notify Better Form immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">8. Acceptable Use</h2>
              <p>You agree not to use Better Form to:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Transmit any unlawful, threatening, abusive, defamatory, obscene, or otherwise objectionable material</li>
                <li>Disrupt the normal flow of dialogue within our website</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Create malicious content or collect user information without consent</li>
                <li>Use the Service for any illegal purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">9. Termination</h2>
              <p>
                Better Form reserves the right to terminate your account and access to the Service at any time, with or without cause, with or without notice. Cause for termination shall include, but not be limited to: (a) breaches or violations of this Agreement; (b) requests by law enforcement or other government agencies; (c) discontinuance or material modification of the Service or any service offered through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">10. Governing Law</h2>
              <p>
                These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction where Better Form is located, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">11. Changes to Terms</h2>
              <p>
                Better Form reserves the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the Service following any such changes constitutes your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">12. Contact</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us through the contact information provided on our website.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 px-6 py-8 mt-16">
        <div className="mx-auto max-w-3xl text-sm text-slate-600 text-center">
          <p>© 2026 Better Form. Built for real workflows.</p>
        </div>
      </footer>
    </div>
  )
}
