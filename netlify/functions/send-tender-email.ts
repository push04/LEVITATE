// Receives {to, subject, html, attachment?} from the local TenderPulse admin
// server (tenderpulse-bj/server/lib/mailer.ts) over HTTPS and actually
// dispatches it via SMTP — the one thing the local PC server can't do
// itself. Uses the same SMTP_HOST/PORT/USER/PASS/FROM env vars as the rest
// of the site's email sending (src/lib/email/client.ts), not Brevo.
import nodemailer from 'nodemailer'
import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  return timingSafeEqual(aa, bb)
}

interface TenderEmailPayload {
  to?: string
  subject?: string
  html?: string
  attachment?: { filename: string; contentBase64: string; contentType: string }
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const expected = process.env.EMAIL_FUNCTION_SECRET
  if (expected) {
    const provided = req.headers.get('x-tenderpulse-secret') || ''
    if (!safeEqual(provided, expected)) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return Response.json({ error: 'SMTP_USER/SMTP_PASS not configured' }, { status: 500 })
  }

  let payload: TenderEmailPayload
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const { to, subject, html, attachment } = payload
  if (!to || !subject || !html) {
    return Response.json({ error: 'to, subject, html are required' }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"TenderPulse BJ" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments: attachment
        ? [{ filename: attachment.filename, content: Buffer.from(attachment.contentBase64, 'base64'), contentType: attachment.contentType }]
        : undefined,
    })

    return Response.json({ ok: true, id: info.messageId })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
