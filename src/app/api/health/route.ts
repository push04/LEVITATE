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
    return { service: 'gemma_kaggle', healthy: false, error: 'Kaggle notebook offline — restart it on kaggle.com' }
  }
}

async function checkSMTP() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  if (!host || !user) return { service: 'smtp_email', healthy: false, error: 'SMTP_HOST or SMTP_USER not set' }
  // Just verify credentials are present — avoid actually connecting on health check
  return { service: 'smtp_email', healthy: true, info: `${user} via ${host}` }
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
    ai_strategy: {
      primary: process.env.GEMMA_API_URL ? 'Qwen2.5-3B (Kaggle GPU — free)' : 'Kaggle not running',
      cost: '₹0/month'
    }
  }, { status: criticalOk ? 200 : 503 })
}
