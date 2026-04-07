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

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Levitate Labs" <${process.env.SMTP_USER}>`,
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

/** Send outreach email to a lead */
export async function sendLeadEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  return sendEmail(to, subject, body)
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
