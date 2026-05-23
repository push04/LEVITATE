/**
 * Health Check Endpoint
 * UptimeRobot pings this every 5 minutes.
 * Returns system status of all integrations.
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

const PLACEHOLDER_MARKERS = ['placeholder', 'your-', 'changeme', 'example', 'test-key']

function isUsableSecret(value: string | undefined | null) {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  const normalized = trimmed.toLowerCase()
  return !PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))
}

function isAuthorized(req: Request) {
  const expected = String(process.env.HEALTHCHECK_TOKEN || '').trim()
  if (!expected) {
    return process.env.NODE_ENV !== 'production'
  }

  const auth = req.headers.get('authorization') || ''
  const [scheme, token] = auth.split(' ')
  if (scheme?.toLowerCase() !== 'bearer') return false
  const provided = (token || '').trim()
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

async function checkSupabase() {
  try {
    const supabase = getServiceSupabase()
    const start = Date.now()
    await supabase.from('system_config').select('key').limit(1)
    return { service: 'supabase', healthy: true, latency_ms: Date.now() - start }
  } catch (err) {
    return { service: 'supabase', healthy: false, error: String(err) }
  }
}

async function checkPrimaryAI() {
  if (!isUsableSecret(process.env.GROQ_API_KEY)) return { service: 'primary_ai', healthy: false, error: 'GROQ_API_KEY not set' }
  if (!process.env.GROQ_API_KEY) return { service: 'primary_ai', healthy: false, error: 'PRIMARY_API_KEY not set' }
  try {
    const start = Date.now()
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      signal: AbortSignal.timeout(5000)
    })
    return { service: 'primary_ai', healthy: res.ok, latency_ms: Date.now() - start, info: 'llama-3.3-70b' }
  } catch {
    return { service: 'primary_ai', healthy: false, error: 'AI unreachable' }
  }
}

async function checkGemini() {
  if (!isUsableSecret(process.env.GEMINI_API_KEY)) return { service: 'gemini_ai', healthy: false, error: 'GEMINI_API_KEY not set' }
  if (!process.env.GEMINI_API_KEY) return { service: 'gemini_ai', healthy: false, error: 'GEMINI_API_KEY not set — get free key at aistudio.google.com' }
  return { service: 'gemini_ai', healthy: true, info: 'gemini-1.5-flash — 1,500 req/day free' }
}

async function checkSMTP() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  if (!isUsableSecret(host) || !isUsableSecret(user)) return { service: 'smtp_email', healthy: false, error: 'SMTP_HOST or SMTP_USER not set' }
  if (!host || !user) return { service: 'smtp_email', healthy: false, error: 'SMTP_HOST or SMTP_USER not set' }
  // Just verify credentials are present — avoid actually connecting on health check
  return { service: 'smtp_email', healthy: true }
}

async function checkRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!isUsableSecret(keyId) || !isUsableSecret(keySecret)) return { service: 'razorpay', healthy: false, error: 'Credentials not set' }
  if (!keyId || !keySecret) return { service: 'razorpay', healthy: false, error: 'Credentials not set' }
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    const start = Date.now()
    const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(5000)
    })
    return { service: 'razorpay', healthy: res.ok, latency_ms: Date.now() - start }
  } catch {
    return { service: 'razorpay', healthy: false, error: 'Razorpay unreachable' }
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    // Avoid leaking integration details to anonymous callers.
    return new Response('Not found', { status: 404 })
  }

  const start = Date.now()
  const checks = await Promise.allSettled([
    checkSupabase(),
    checkPrimaryAI(),
    checkGemini(),
    checkSMTP(),
    checkRazorpay()
  ])

  const results = checks.map(c => c.status === 'fulfilled' ? c.value : { service: 'unknown', healthy: false })
  const criticalServices = ['supabase', 'razorpay']
  const criticalOk = results.filter(r => criticalServices.includes(r.service)).every(r => r.healthy)
  const allOk = results.every(r => r.healthy)

  return NextResponse.json({
    status: allOk ? 'ok' : criticalOk ? 'degraded' : 'critical',
    timestamp: new Date().toISOString(),
    response_ms: Date.now() - start,
    checks: results,
  }, { status: criticalOk ? 200 : 503 })
}
