import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-semibold text-slate-950 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-600 mb-8">Last updated: May 2026</p>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">1. Introduction</h2>
              <p>
                Better Form ("we", "us", "our", or "Company") operates the Better Form website and service. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
              </p>
              <p className="mt-3">
                We use your data to provide and improve the Service. By using Better Form, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">2. Information Collection and Use</h2>
              <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">Types of Data Collected:</h3>

              <h4 className="font-semibold text-slate-900 mt-3">Personal Data</h4>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Email address</li>
                <li>First name / Last name</li>
                <li>Password (hashed and encrypted)</li>
                <li>Usage data (forms created, responses collected, etc.)</li>
              </ul>

              <h4 className="font-semibold text-slate-900 mt-4">Usage Data</h4>
              <p className="mt-2">
                We may also collect information on how the Service is accessed and used ("Usage Data"). This may include information such as:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Your browser type and version</li>
                <li>Your IP address</li>
                <li>Pages you visit</li>
                <li>The time and date of your visit</li>
                <li>The time spent on pages</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">3. Use of Data</h2>
              <p>Better Form uses the collected data for various purposes:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>To provide and maintain the Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
                <li>To provide customer care and support</li>
                <li>To gather analysis or valuable information so that we can improve the Service</li>
                <li>To monitor the usage of the Service</li>
                <li>To detect, prevent and address technical issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">4. Form Responses and User Data</h2>
              <p>
                Form responses and user data submitted through forms created on Better Form are owned by you. We store this data solely to deliver the Service and do not use it for any marketing, analytics, or other purposes beyond what you explicitly authorize.
              </p>
              <p className="mt-3">
                You are responsible for ensuring you have appropriate consent from form respondents before collecting their data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">5. Security of Data</h2>
              <p>
                The security of your data is important to us, but remember that no method of transmission over the Internet is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
              </p>
              <p className="mt-3">
                We implement industry-standard encryption, secure password hashing, and other security measures to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">6. Data Retention</h2>
              <p>
                Better Form will retain your Personal Data only for as long as necessary to provide the Service to you. You can request deletion of your account and associated data at any time through your account settings or by contacting us directly.
              </p>
              <p className="mt-3">
                Form response data will be retained as long as you maintain your account, unless you choose to delete specific responses or your entire account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">7. Your Rights</h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal data, including:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>The right to access your personal data</li>
                <li>The right to correct inaccurate data</li>
                <li>The right to request deletion of your data</li>
                <li>The right to request restriction of processing</li>
                <li>The right to data portability</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, please contact us using the information provided in the Contact section.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">8. Service Providers</h2>
              <p>
                We may employ third-party companies and individuals to facilitate our Service, provide the Service on our behalf, perform Service-related services, or assist us in analyzing how our Service is used. These parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">9. Links to Other Sites</h2>
              <p>
                Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.
              </p>
              <p className="mt-3">
                We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">10. Children's Privacy</h2>
              <p>
                Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If we become aware that a child under 13 has provided us with Personal Data, we will immediately take steps to remove such information from our servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">11. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
              </p>
              <p className="mt-3">
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-950 mb-3">12. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us by email or through the contact form on our website.
              </p>
              <p className="mt-3">
                Your privacy is important to us, and we are committed to being transparent about how we handle your data.
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
