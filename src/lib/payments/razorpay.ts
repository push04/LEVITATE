/**
 * Razorpay Integration — Levitate Labs
 * Keys are loaded from environment variables (set in Netlify dashboard)
 */

import crypto from 'crypto'

const RAZORPAY_BASE = 'https://api.razorpay.com/v1'

function getAuth(): string {
  const keyId = process.env.RAZORPAY_KEY_ID ?? ''
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
}

export interface RazorpayLink {
  id: string
  short_url: string
  amount: number
  status: string
  reference_id: string
}

export async function createPaymentLink(params: {
  amount: number       // in INR (will be converted to paise)
  description: string
  name: string
  contact: string
  email?: string
  referenceId: string  // proposal or invoice ID
}): Promise<RazorpayLink> {
  const contact = params.contact.replace(/[^0-9]/g, '')
  const res = await fetch(`${RAZORPAY_BASE}/payment_links`, {
    method: 'POST',
    headers: {
      Authorization: getAuth(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Math.round(params.amount * 100),
      currency: 'INR',
      description: params.description,
      customer: {
        name: params.name,
        ...(contact ? { contact } : {}),
        ...(params.email ? { email: params.email } : {}),
      },
      // Only ask Razorpay to SMS/email a reminder if we actually have that
      // contact detail — a blank contact with sms:true can be rejected by
      // the API for a customer with no phone on file.
      notify: { sms: Boolean(contact), email: Boolean(params.email) },
      reminder_enable: true,
      reference_id: params.referenceId,
      expire_by: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      callback_url: 'https://levitatelabs.online/api/webhook/razorpay',
      callback_method: 'get',
      options: {
        checkout: {
          name: 'Levitate Labs',
          description: params.description,
          prefill: { name: params.name, ...(contact ? { contact } : {}), ...(params.email ? { email: params.email } : {}) }
        }
      }
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Razorpay error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export function verifyRazorpaySignature(body: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false
    return true // Skip verification in dev only
  }

  try {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(signature.replace(/^sha256=/, ''), 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function getPaymentDetails(paymentId: string) {
  const res = await fetch(`${RAZORPAY_BASE}/payments/${paymentId}`, {
    headers: { Authorization: getAuth() }
  })
  return res.json()
}
