import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Levitate Labs',
  description: 'Privacy policy for Levitate Labs and LevitateOS platform.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[var(--text-primary)]">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">Last updated: June 13, 2026</p>

      <section className="mt-10 space-y-6 leading-relaxed text-[var(--text-secondary)]">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">1. Who we are</h2>
          <p className="mt-2">
            Levitate Labs operates the LevitateOS platform (levitatelabs.online) — a WhatsApp-first AI business
            operating system for Indian MSMEs. References to "we", "us", or "Levitate Labs" in this policy refer
            to the same entity. You can reach us at{' '}
            <a href="mailto:levitatelabs.online@gmail.com" className="text-[var(--gold-base)] underline">
              levitatelabs.online@gmail.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">2. Information we collect</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              <strong>Account data</strong> — name, email address, business name, and phone number provided
              during registration or profile setup.
            </li>
            <li>
              <strong>Business data</strong> — information you enter about your business, leads, customers, and
              operations within the platform.
            </li>
            <li>
              <strong>WhatsApp communications</strong> — messages sent or received via the Meta WhatsApp Business
              API on your behalf. These are processed solely to deliver the messaging service and are not used for
              advertising or sold to third parties.
            </li>
            <li>
              <strong>Usage data</strong> — pages visited, features used, and timestamps, collected automatically
              to improve the platform.
            </li>
            <li>
              <strong>Device and browser data</strong> — IP address, browser type, and operating system, collected
              via standard web server logs.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">3. How we use your information</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Provide, operate, and maintain the LevitateOS platform and its features.</li>
            <li>Send WhatsApp messages on your behalf to contacts you have authorised.</li>
            <li>Generate AI-powered insights, lead summaries, and automations for your business.</li>
            <li>Respond to your support requests and communicate service updates.</li>
            <li>Comply with applicable laws and Meta Platform Terms for WhatsApp Business API.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">4. Data sharing</h2>
          <p className="mt-2">
            We do not sell your personal data. We share data only with the service providers required to operate
            the platform:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              <strong>Supabase</strong> — database hosting (your data is stored in secured Supabase instances).
            </li>
            <li>
              <strong>Meta (WhatsApp Business API)</strong> — to send and receive WhatsApp messages on your
              behalf. Meta's use of data is governed by Meta's own privacy policy.
            </li>
            <li>
              <strong>Groq / AI providers</strong> — anonymised query text may be sent to AI inference providers
              to generate responses. No personally identifiable contact data is shared.
            </li>
            <li>
              <strong>Netlify</strong> — serverless hosting for the web application and background functions.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">5. WhatsApp data</h2>
          <p className="mt-2">
            When you use our WhatsApp integration, we process messages through the Meta WhatsApp Business API
            under your Meta Business Account. We act as a data processor on your behalf. Message content is used
            solely to deliver the requested communication and is not retained beyond operational necessity.
          </p>
          <p className="mt-2">
            Recipients of WhatsApp messages sent via Levitate Labs can opt out at any time by replying "STOP".
            We honour all opt-out requests within 24 hours.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">6. Data retention</h2>
          <p className="mt-2">
            We retain your data for as long as your account is active or as needed to provide services. You may
            request deletion of your data at any time — see Section 8. Backups may retain data for up to 30 days
            after deletion.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">7. Security</h2>
          <p className="mt-2">
            We use industry-standard security measures including encrypted connections (HTTPS/TLS), database
            row-level security, and access controls. No method of transmission or storage is 100% secure, and
            we cannot guarantee absolute security.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">8. Your rights and data deletion</h2>
          <p className="mt-2">You have the right to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data (see our{' '}
              <a href="/data-deletion" className="text-[var(--gold-base)] underline">Data Deletion page</a>).
            </li>
            <li>Object to or restrict certain processing.</li>
            <li>Port your data to another service in a machine-readable format.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email us at{' '}
            <a href="mailto:levitatelabs.online@gmail.com" className="text-[var(--gold-base)] underline">
              levitatelabs.online@gmail.com
            </a>{' '}
            with the subject line "Data Request — [your email]".
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">9. Cookies</h2>
          <p className="mt-2">
            We use essential cookies to maintain your authenticated session. We do not use third-party advertising
            cookies. You can disable cookies in your browser, but doing so may prevent access to authenticated
            areas of the platform.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">10. Changes to this policy</h2>
          <p className="mt-2">
            We may update this policy from time to time. We will notify you of material changes by email or via
            an in-app notice. Continued use of the platform after changes take effect constitutes acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">11. Contact</h2>
          <p className="mt-2">
            Questions about this policy? Contact us at{' '}
            <a href="mailto:levitatelabs.online@gmail.com" className="text-[var(--gold-base)] underline">
              levitatelabs.online@gmail.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  )
}
