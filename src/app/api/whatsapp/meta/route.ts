/**
 * Meta WhatsApp Cloud API Webhook
 * GET  — webhook verification (Meta sends hub.challenge)
 * POST — inbound messages from Meta
 *
 * Env vars required:
 *   WHATSAPP_ACCESS_TOKEN       — Meta Cloud API token
 *   WHATSAPP_PHONE_NUMBER_ID    — e.g. 1107801055757202
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — any secret string you set in Meta Developer Console
 *   GROQ_API_KEY                — for AI intent detection
 *   OWNER_WHATSAPP_NUMBER       — your number (admin-only commands)
 *
 * Register this URL in Meta Developer Console:
 *   Webhook URL: https://levitatelabs.online/api/whatsapp/meta
 *   Verify token: value of WHATSAPP_WEBHOOK_VERIFY_TOKEN
 *   Subscribe to: messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { scrapeLeads } from '@/lib/scrapers/free-sources'
import { callAI } from '@/lib/ai/router'
import { getServiceSupabase } from '@/lib/supabase'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'levitate-meta-webhook'
const TOKEN = () => process.env.WHATSAPP_ACCESS_TOKEN ?? ''
const PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
const OWNER = () => (process.env.OWNER_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')

// ── Verification handshake ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verified')
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── Send WhatsApp via Meta Cloud API ─────────────────────────────────────────
async function sendWA(to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error(`[Meta Webhook] Send failed ${res.status}:`, err.slice(0, 200))
    return false
  }
  return true
}

// ── Mark message as read ──────────────────────────────────────────────────────
async function markRead(messageId: string) {
  await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {})
}

// ── AI: detect intent and extract params ─────────────────────────────────────
async function detectIntent(message: string): Promise<{
  intent: 'lead_search' | 'greeting' | 'status' | 'general'
  city?: string
  category?: string
}> {
  const raw = await callAI(
    `You are an AI for Levitate Labs, a WhatsApp-first lead generation platform for Indian businesses.
Classify the user message and extract parameters.
Reply ONLY with valid JSON — no extra text:
{"intent": "lead_search"|"greeting"|"status"|"general", "city": "<city or null>", "category": "<business category or null>"}

Intent rules:
- "lead_search": user wants business leads, contacts, or data for a specific type of business/location
- "greeting": hi, hello, hey, good morning etc
- "status": asking about system status, how many leads, reports
- "general": anything else`,
    `Message: "${message}"`,
    120,
    'meta-intent'
  )

  try {
    const parsed = JSON.parse(raw.replace(/```json?|```/g, '').trim()) as {
      intent: 'lead_search' | 'greeting' | 'status' | 'general'
      city?: string
      category?: string
    }
    return parsed
  } catch {
    return { intent: 'general' }
  }
}

// ── Format lead results as WhatsApp message ───────────────────────────────────
function formatLeads(leads: Awaited<ReturnType<typeof scrapeLeads>>, city: string, category: string): string {
  if (leads.length === 0) {
    return `No leads found for *${category}* in *${city}* right now. Try a different category or city.`
  }

  const lines = [
    `*${leads.length} ${category} leads in ${city}*`,
    '',
  ]

  leads.forEach((l, i) => {
    lines.push(`*${i + 1}. ${l.business_name}*`)
    if (l.phone) lines.push(`   📞 ${l.phone}`)
    if (l.address) lines.push(`   📍 ${l.address.slice(0, 60)}`)
    if (l.website) lines.push(`   🌐 ${l.website.replace(/^https?:\/\//, '').split('/')[0]}`)
    lines.push('')
  })

  lines.push(`_Scraped live from ${[...new Set(leads.map(l => String(l.raw_data?.source ?? '')).filter(Boolean))].join(', ')}_`)
  return lines.join('\n')
}

// ── Log to Supabase (best-effort) ─────────────────────────────────────────────
async function logMessage(from: string, message: string, reply: string, intent: string) {
  try {
    const supabase = getServiceSupabase()
    await supabase.from('company_whatsapp_messages').insert([
      { direction: 'inbound', from_number: from, message, status: 'delivered', is_ai_response: false },
      { direction: 'outbound', to_number: from, message: reply, status: 'sent', is_ai_response: true },
    ])
  } catch { /* non-fatal */ }
}

// ── Inbound message handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!payload || payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true })
  }

  const entries = payload.entry as Array<{ changes: Array<{ value: Record<string, unknown> }> }> | undefined
  if (!entries?.length) return NextResponse.json({ ok: true })

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value?.messages) continue

      const messages = value.messages as Array<{ id: string; from: string; type: string; text?: { body: string } }>
      for (const msg of messages) {
        if (msg.type !== 'text' || !msg.text?.body) continue

        const from = msg.from
        const text = msg.text.body.trim()

        // Async processing — respond 200 immediately to Meta (avoid timeout)
        processMessage(from, text, msg.id).catch(e => console.error('[Meta Webhook] Process error:', e))
      }
    }
  }

  return NextResponse.json({ ok: true })
}

async function processMessage(from: string, text: string, messageId: string) {
  // Mark as read
  await markRead(messageId)

  const isOwner = from.replace(/\D/g, '').endsWith(OWNER().slice(-10))

  // Detect intent
  let intent: Awaited<ReturnType<typeof detectIntent>>
  try {
    intent = await detectIntent(text)
  } catch {
    intent = { intent: 'general' }
  }

  let reply = ''

  if (intent.intent === 'greeting') {
    reply = isOwner
      ? `Hey! 👋 I'm your Levitate AI assistant.\n\nAsk me to find leads — e.g.:\n• "Find dental clinics in Pune"\n• "Get 10 restaurants in Mumbai"\n• "Show gyms in Delhi"\n\nOr ask about your business status.`
      : `Hi! I'm the Levitate AI assistant. How can I help you today?`

  } else if (intent.intent === 'lead_search' && intent.city && intent.category) {
    const city = intent.city
    const category = intent.category

    // Send "searching" indicator first
    await sendWA(from, `🔍 Searching for *${category}* leads in *${city}*...`)

    try {
      const leads = await scrapeLeads(city, category, 5)
      reply = formatLeads(leads, city, category)
    } catch {
      reply = `Search failed for ${category} in ${city}. Please try again.`
    }

  } else if (intent.intent === 'status' && isOwner) {
    try {
      const supabase = getServiceSupabase()
      const { count } = await supabase.from('potential_leads').select('id', { count: 'exact', head: true })
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
      const { count: todayCount } = await supabase.from('potential_leads').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo)
      reply = `*Levitate Status*\n\n📊 Total leads in DB: *${count?.toLocaleString('en-IN')}*\n📅 Added today: *${todayCount}*\n🤖 AI: Groq active\n📡 Meta API: connected`
    } catch {
      reply = 'Unable to fetch status right now.'
    }

  } else if (intent.intent === 'lead_search' && (!intent.city || !intent.category)) {
    reply = `I can find leads for you! Please specify:\n• *Business type* (e.g. restaurant, gym, dental clinic)\n• *City* (e.g. Mumbai, Delhi, Bangalore)\n\nExample: "Find plumbers in Pune"`

  } else {
    try {
      reply = await callAI(
        `You are Levitate AI, a WhatsApp assistant for Levitate Labs — a lead generation and business automation platform for Indian MSMEs. Keep replies under 100 words. No markdown asterisks for bold (use plain text). Be helpful and brief.`,
        text,
        200,
        'meta-general'
      )
      reply = reply.trim()
    } catch {
      reply = `I'm here to help! Ask me to find business leads — e.g. "Find restaurants in Mumbai" or "Get dental clinics in Pune".`
    }
  }

  if (reply) {
    await sendWA(from, reply)
    await logMessage(from, text, reply, intent.intent)
  }
}
