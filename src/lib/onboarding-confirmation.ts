import nodemailer from 'nodemailer'
import { getEmailTemplate } from '@/lib/email-template'

type ConfirmationEmailInput = {
  to: string
  ownerName: string
  companyName: string
  planName: string
  billingCycle: string
  amount: number
  dashboardUrl: string
  workspaceUrl: string
}

export async function sendOnboardingConfirmationEmail(input: ConfirmationEmailInput) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.warn('[Onboarding] SMTP is not configured, skipping confirmation email.')
    return false
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online'
    const dashboardLink = input.dashboardUrl.startsWith('http')
      ? input.dashboardUrl
      : `${appUrl}${input.dashboardUrl.startsWith('/') ? input.dashboardUrl : `/${input.dashboardUrl}`}`
    const workspaceLink = input.workspaceUrl.startsWith('http')
      ? input.workspaceUrl
      : `${appUrl}${input.workspaceUrl.startsWith('/') ? input.workspaceUrl : `/${input.workspaceUrl}`}`

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })

    const html = getEmailTemplate({
      title: 'Your Levitate Labs workspace is ready',
      recipientName: input.ownerName || 'Partner',
      message: `Your onboarding payment has been confirmed for ${input.companyName}.

Plan: ${input.planName}
Billing cycle: ${input.billingCycle}
Amount: Rs. ${input.amount.toLocaleString('en-IN')}

Your dashboard is ready, and your branded workspace is queued for provisioning.

You can review the workspace, projects, and rollout status from the dashboard link below.

Fallback backlink if needed: ${appUrl}/company

Business backlink: ${workspaceLink}`,
      ctaText: 'Open Dashboard',
      ctaLink: dashboardLink,
      footerText: 'If you have any questions, reply to this email and our team will help you through the rollout.',
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Levitate Labs" <noreply@levitatelabs.online>',
      to: input.to,
      subject: `Payment confirmed for ${input.companyName}`,
      html,
    })

    return true
  } catch (error) {
    console.error('[Onboarding] Failed to send confirmation email:', error)
    return false
  }
}
