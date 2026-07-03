// Embedded directly in the Next.js app (which is itself deployed to
// Netlify), so this calls Brevo's API straight from the API route — no
// separate function hop needed. Requires BREVO_API_KEY in the site's env
// vars; degrades to a logged no-op if it isn't set yet.
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email'

export interface SendEmailResult {
  ok: boolean
  error?: string
}

export async function sendTenderEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.log(`[tenderpulse-mailer] BREVO_API_KEY not set — would have emailed "${subject}" to ${to}`)
    return { ok: false, error: 'BREVO_API_KEY not configured' }
  }

  try {
    const resp = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.EMAIL_FROM_NAME || 'TenderPulse BJ', email: process.env.EMAIL_FROM || 'alerts@levitatelabs.online' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return { ok: false, error: data.message || `Brevo HTTP ${resp.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
