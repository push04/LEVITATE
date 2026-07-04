/**
 * Email Client — Levitate Labs Automation
 * Replaces WhatsApp for all agent notifications and outreach
 * Uses SMTP (nodemailer) — env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

type SendEmailOptions = {
  /** Display name to use in the From header, e.g. a business's own name. */
  fromName?: string
  /**
   * Overrides the From address (e.g. a business.<slug>@levitatelabs.online alias).
   * Still sent via the same authenticated SMTP account — this only changes the
   * visible From header, not the envelope sender.
   */
  fromAddress?: string
  replyTo?: string
}

export async function sendEmail(to: string, subject: string, body: string, options?: SendEmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const fromAddress = options?.fromAddress || process.env.SMTP_USER
    const fromName = options?.fromName || 'Levitate Labs'
    await transporter.sendMail({
      from: process.env.SMTP_FROM && !options?.fromAddress ? process.env.SMTP_FROM : `"${fromName}" <${fromAddress}>`,
      ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    })
    return true
  } catch (e) {
    console.error('[Email] send failed:', e)
    return false
  }
}

/** Send notification to the founder (founder@levitatelabs.online) */
export async function notifyFounder(subject: string, body: string): Promise<boolean> {
  return sendEmail('founder@levitatelabs.online', subject, body)
}

/**
 * Send cold outreach email to a lead.
 * Sends plain text only — no HTML, no styling, no footers.
 * Plain text = highest deliverability for cold email.
 */
export async function sendLeadEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Levitate Labs" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body,
      // No html field — plain text only avoids spam filters on cold outreach
    })
    return true
  } catch (e) {
    console.error('[Lead email] send failed:', e)
    return false
  }
}

/** Parse incoming email data (for future webhook use) */
export function extractEmailData(body: Record<string, unknown>) {
  return {
    from: body.from as string,
    subject: body.subject as string,
    text: body.text as string,
    to: body.to as string,
  }
}
