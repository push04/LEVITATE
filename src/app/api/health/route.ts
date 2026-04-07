/**
 * Health Check Endpoint
 * UptimeRobot pings this every 5 minutes.
 * Returns system status of all integrations.
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

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

async function checkGemmaAPI() {
  const url = process.env.GEMMA_API_URL
  if (!url) return { service: 'gemma_kaggle', healthy: false, error: 'GEMMA_API_URL not set' }

  try {
    const start = Date.now()
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
    return { service: 'gemma_kaggle', healthy: res.ok, latency_ms: Date.now() - start }
  } catch {
    return { service: 'gemma_kaggle', healthy: false, error: 'Kaggle notebook offline' }
  }
}

async function checkGroq() {
  if (!process.env.GROQ_API_KEY) return { service: 'groq', healthy: false, error: 'GROQ_API_KEY not set' }
  try {
    const start = Date.now()
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      signal: AbortSignal.timeout(5000)
    })
    return { service: 'groq', healthy: res.ok, latency_ms: Date.now() - start }
  } catch {
    return { service: 'groq', healthy: false, error: 'Groq unreachable' }
  }
}

async function checkWhatsApp() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) return { service: 'whatsapp', healthy: false, error: 'Credentials not set' }

  try {
    const start = Date.now()
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }
    )
    return { service: 'whatsapp', healthy: res.ok, latency_ms: Date.now() - start }
  } catch {
    return { service: 'whatsapp', healthy: false, error: 'WhatsApp API unreachable' }
  }
}

async function checkRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
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

export async function GET() {
  const start = Date.now()
  const checks = await Promise.allSettled([
    checkSupabase(),
    checkGemmaAPI(),
    checkGroq(),
    checkWhatsApp(),
    checkRazorpay()
  ])

  const results = checks.map(c => c.status === 'fulfilled' ? c.value : { service: 'unknown', healthy: false })
  const allHealthy = results.every(r => r.healthy)
  const criticalHealthy = results.filter(r => ['supabase', 'whatsapp'].includes(r.service)).every(r => r.healthy)

  return NextResponse.json({
    status: allHealthy ? 'ok' : criticalHealthy ? 'degraded' : 'critical',
    timestamp: new Date().toISOString(),
    response_ms: Date.now() - start,
    checks: results,
    ai_strategy: {
      primary: process.env.GEMMA_API_URL ? 'Gemma 4 (Kaggle GPU)' : 'Not configured',
      fallback: process.env.GROQ_API_KEY ? 'Groq (free tier)' : 'Not configured',
      cost: '₹0/month'
    }
  }, { status: allHealthy ? 200 : 503 })
}
