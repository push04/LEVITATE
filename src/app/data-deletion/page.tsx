import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Deletion Request — Levitate Labs',
  description: 'Request deletion of your personal data from the Levitate Labs platform.',
}

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[var(--text-primary)]">
      <h1 className="text-3xl font-semibold tracking-tight">Data Deletion Request</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">
        Levitate Labs — levitatelabs.online
      </p>

      <section className="mt-10 space-y-8 leading-relaxed text-[var(--text-secondary)]">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your right to deletion</h2>
          <p className="mt-2">
            You have the right to request that Levitate Labs delete all personal data we hold about you, including
            your account, business data, lead records, and any WhatsApp interaction history processed through our
            platform.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">What gets deleted</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Your user account and authentication credentials</li>
            <li>Your business profile, workspace settings, and subscription data</li>
            <li>All lead records, CRM entries, and pipeline data in your workspace</li>
            <li>WhatsApp campaign history and message queue entries</li>
            <li>AI-generated reports, research runs, and automation logs</li>
            <li>Uploaded files and imported contacts</li>
          </ul>
          <p className="mt-3 text-sm">
            Deletion is permanent and cannot be undone. Backups may retain data for up to 30 days.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">How to request deletion</h2>
          <p className="mt-2">
            Send an email to{' '}
            <a href="mailto:levitatelabs.online@gmail.com" className="text-[var(--gold-base)] underline font-medium">
              levitatelabs.online@gmail.com
            </a>{' '}
            with:
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-1">
            <li>
              <strong>Subject:</strong> Data Deletion Request — [your registered email address]
            </li>
            <li>
              <strong>Your registered email address</strong> (the one you used to sign up)
            </li>
            <li>
              <strong>Optional:</strong> reason for deletion (helps us improve)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Response time</h2>
          <p className="mt-2">
            We will acknowledge your request within <strong>48 hours</strong> and complete the deletion within{' '}
            <strong>30 days</strong>. You will receive a confirmation email once your data has been deleted.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Facebook / Meta connected data</h2>
          <p className="mt-2">
            If you connected Levitate Labs with your Facebook or Meta account (for WhatsApp Business API access),
            you can also remove the connection directly from Facebook:
          </p>
          <ol className="mt-3 list-decimal pl-5 space-y-1">
            <li>Go to Facebook Settings → Security and Login → Apps and Websites</li>
            <li>Find "Levitate Labs" in the list</li>
            <li>Click Remove</li>
          </ol>
          <p className="mt-3">
            Removing the Facebook connection stops any future data sharing but does not delete data already stored
            in Levitate Labs. Send the email above to remove all stored data.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">Contact for data requests</p>
          <a
            href="mailto:levitatelabs.online@gmail.com"
            className="mt-2 inline-block text-[var(--gold-base)] underline text-sm"
          >
            levitatelabs.online@gmail.com
          </a>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            Response within 48 hours · Deletion completed within 30 days
          </p>
        </div>
      </section>
    </main>
  )
}
