import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the Saksham website handles data for its informational and admin-dashboard use.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-foreground-dim hover:text-brand">
        <ArrowLeft className="h-4 w-4" />
        Back to Saksham
      </Link>

      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-foreground-faint">Last updated: September 2026</p>

      <div className="mt-6 rounded-md border border-warning/25 bg-warning-soft p-4 text-sm text-warning">
        This is a good-faith draft written to accurately describe what this site actually does with data. It is
        <strong> not a substitute for review by a qualified legal advisor</strong> before real-world use, given
        obligations under India&apos;s Digital Personal Data Protection Act, 2023.
      </div>

      <div className="prose-content mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-semibold">1. Who this covers</h2>
          <p className="mt-2 text-foreground-dim">
            This policy covers the Saksham website (this domain). Saksham itself — the voice-first assistant that
            maps a beneficiary&apos;s described skill to a formal NSQF qualification and PM-AJAY training programme —
            is delivered through the separate Saksham mobile app and WhatsApp channel, not through this website. This
            site is an informational overview of the programme plus the admin dashboard used by Ministry of Social
            Justice &amp; Empowerment staff to monitor programme activity.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. What we collect</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-dim">
            <li><strong className="text-foreground">Admin login credentials</strong> — phone number and password (stored as a one-way hash, never in plain text, by the backend) for programme administrators who sign in to the dashboard.</li>
            <li><strong className="text-foreground">Admin session token</strong> — stored locally in your browser after login, so you stay signed in to the dashboard.</li>
            <li><strong className="text-foreground">Standard web request logs</strong> — IP address and browser type, collected by our hosting provider for any visitor to this site.</li>
          </ul>
          <p className="mt-2 text-foreground-dim">
            This website does not collect voice transcripts, onboarding answers, profile photos, or location data
            directly — that data is collected by the Saksham mobile app and WhatsApp channel, and is only ever
            <em> displayed</em> here, in aggregate and per-beneficiary form, to authenticated administrators.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Who else sees your data</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-dim">
            <li><strong className="text-foreground">Vercel</strong> — hosts this website and processes standard web request logs for operating the service.</li>
            <li><strong className="text-foreground">The Saksham backend</strong> (a separate government-facing service) — stores beneficiary accounts, sessions, and recommendation history collected via the app/WhatsApp, and is what powers the admin analytics dashboard on this site.</li>
          </ul>
          <p className="mt-2 text-foreground-dim">We do not sell any data to anyone, for any reason.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Why we collect it</h2>
          <p className="mt-2 text-foreground-dim">
            Admin credentials exist solely to restrict the dashboard to authorized programme staff. We do not use any
            data for advertising, and there is no third-party ad tracking on this site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. How long we keep it</h2>
          <p className="mt-2 text-foreground-dim">
            Beneficiary account and session data (collected via the app/WhatsApp, displayed here) is retained by the
            backend for as long as the beneficiary&apos;s account exists. An admin&apos;s session token is stored only
            in their own browser and is removed on sign-out or when the browser&apos;s site data is cleared.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Contact</h2>
          <p className="mt-2 text-foreground-dim">
            This is a prototype built for demonstration under the PM-AJAY scheme. For a production deployment,
            replace this section with a real grievance-officer contact as required under the DPDP Act, 2023.
          </p>
        </section>
      </div>
    </main>
  );
}
