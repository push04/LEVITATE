import crypto from 'crypto'

const RAZORPAY_BASE = 'https://api.razorpay.com/v1'

function getAuth() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? ''
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
}

export async function createRazorpayPlan(params: {
  name: string
  amountInRupees: number
  period: 'monthly' | 'yearly'
  interval?: number
  description?: string
}) {
  const res = await fetch(`${RAZORPAY_BASE}/plans`, {
    method: 'POST',
    headers: {
      Authorization: getAuth(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      period: params.period,
      interval: params.interval ?? 1,
      item: {
        name: params.name,
        amount: Math.round(params.amountInRupees * 100),
        currency: 'INR',
        description: params.description ?? params.name
      }
    })
  })

  if (!res.ok) {
    throw new Error(`Razorpay plan error: ${await res.text()}`)
  }

  return res.json() as Promise<{ id: string }>
}

export async function createRazorpaySubscription(params: {
  planId: string
  totalCount: number
  customerName: string
  customerEmail: string
  referenceId: string
  notes?: Record<string, string>
  setupFeeInRupees?: number
  setupFeeLabel?: string
}) {
  const addons = params.setupFeeInRupees && params.setupFeeInRupees > 0
    ? [{
        item: {
          name: params.setupFeeLabel ?? 'One-time setup fee',
          amount: Math.round(params.setupFeeInRupees * 100),
          currency: 'INR'
        }
      }]
    : undefined

  const res = await fetch(`${RAZORPAY_BASE}/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: getAuth(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan_id: params.planId,
      total_count: params.totalCount,
      customer_notify: 1,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      ...(addons ? { addons } : {}),
      notes: {
        reference_id: params.referenceId,
        ...(params.notes ?? {})
      }
    })
  })

  if (!res.ok) {
    throw new Error(`Razorpay subscription error: ${await res.text()}`)
  }

  return res.json() as Promise<{ id: string; short_url?: string }>
}

export function verifyRazorpaySubscriptionSignature(params: {
  paymentId: string
  subscriptionId: string
  signature: string
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''
  if (!keySecret) return false

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.paymentId}|${params.subscriptionId}`)
    .digest('hex')

  const expectedBuf = Buffer.from(expected, 'hex')
  const givenBuf = Buffer.from(params.signature, 'hex')
  if (expectedBuf.length !== givenBuf.length) return false

  return crypto.timingSafeEqual(expectedBuf, givenBuf)
}
