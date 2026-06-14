/**
 * Meta WhatsApp Cloud API Webhook
 * GET  — webhook verification
 * POST — inbound messages (processed SYNCHRONOUSLY before returning 200)
 *
 * Netlify Free = 10s hard cap. We must complete everything within 10s.
 * Fire-and-forget is NOT safe on Lambda/Netlify — process is frozen after response.
 */

import { NextRequest, NextResponse } from 'next/server'
import { scrapeLeads } from '@/lib/scrapers/free-sources'
import { callAI } from '@/lib/ai/router'
import { getServiceSupabase } from '@/lib/supabase'

const TOKEN = () => process.env.WHATSAPP_ACCESS_TOKEN ?? ''
const PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
const OWNER = () => (process.env.OWNER_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')

// ── Verification handshake ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  if (!VERIFY_TOKEN) {
    return new Response('Forbidden', { status: 403 })
  }

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
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID()}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error(`[WA] Send failed ${res.status}:`, err.slice(0, 200))
      return false
    }
    return true
  } catch (e) {
    console.error('[WA] Send error:', e)
    return false
  }
}

// ── Mark message as read ──────────────────────────────────────────────────────
async function markRead(messageId: string) {
  await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {})
}

// ── AI: detect intent ─────────────────────────────────────────────────────────
async function detectIntent(message: string): Promise<{
  intent: 'lead_search' | 'greeting' | 'status' | 'general'
  city?: string
  category?: string
}> {
  try {
    const raw = await callAI(
      `Classify this WhatsApp message for a lead generation platform.
Reply ONLY with valid JSON, no extra text:
{"intent":"lead_search"|"greeting"|"status"|"general","city":"<city or null>","category":"<business type or null>"}

- lead_search: wants business leads/contacts for a city+type
- greeting: hi, hello, hey, good morning
- status: how many leads, system status, reports
- general: anything else`,
      `Message: "${message}"`,
      80,
      'meta-intent'
    )
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

// ── Format lead results ───────────────────────────────────────────────────────
function formatLeads(leads: Awaited<ReturnType<typeof scrapeLeads>>, city: string, category: string): string {
  if (leads.length === 0) {
    return `No leads found for *${category}* in *${city}* right now. Try a different category or city.`
  }
  const lines = [`*${leads.length} ${category} leads in ${city}*`, '']
  leads.forEach((l, i) => {
    lines.push(`*${i + 1}. ${l.business_name}*`)
    if (l.phone) lines.push(`   📞 ${l.phone}`)
    if (l.address) lines.push(`   📍 ${l.address.slice(0, 60)}`)
    if (l.website) lines.push(`   🌐 ${l.website.replace(/^https?:\/\//, '').split('/')[0]}`)
    lines.push('')
  })
  const sources = [...new Set(leads.map(l => String(l.raw_data?.source ?? '')).filter(Boolean))].join(', ')
  lines.push(`_Scraped live from ${sources}_`)
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

// ── Inbound message handler (SYNCHRONOUS — must finish within 10s) ─────────────
async function processMessage(from: string, text: string, messageId: string) {
  console.log(`[WA] Message from ${from}: "${text}"`)

  // markRead + detectIntent in parallel (saves ~300ms)
  const [, intent] = await Promise.all([
    markRead(messageId),
    detectIntent(text),
  ])

  console.log(`[WA] Intent: ${JSON.stringify(intent)}`)

  const isOwner = from.replace(/\D/g, '').endsWith(OWNER().slice(-10))
  let reply = ''

  if (intent.intent === 'greeting') {
    reply = isOwner
      ? `Hey! 👋 I'm your Levitate AI assistant.\n\nAsk me to find leads:\n• "Find dental clinics in Pune"\n• "Get restaurants in Mumbai"\n• "Show gyms in Delhi"\n\nOr ask about your business status.`
      : `Hi! I'm the Levitate AI assistant. How can I help?`

  } else if (intent.intent === 'lead_search' && intent.city && intent.category) {
    const city = intent.city
    const category = intent.category

    // Send "Searching..." FIRST so user sees immediate feedback
    await sendWA(from, `🔍 Searching for *${category}* leads in *${city}*...`)

    try {
      // 5s budget remaining: scrape with strict timeout
      const leads = await Promise.race([
        scrapeLeads(city, category, 5),
        new Promise<[]>(resolve => setTimeout(() => resolve([]), 5500)),
      ])
      reply = formatLeads(leads as Awaited<ReturnType<typeof scrapeLeads>>, city, category)
    } catch {
      reply = `Search failed for ${category} in ${city}. Please try again.`
    }

  } else if (intent.intent === 'status' && isOwner) {
    try {
      const supabase = getServiceSupabase()
      const [{ count }, { count: todayCount }] = await Promise.all([
        supabase.from('potential_leads').select('id', { count: 'exact', head: true }),
        supabase.from('potential_leads').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      ])
      reply = `*Levitate Status*\n\n📊 Total leads: *${count?.toLocaleString('en-IN')}*\n📅 Added today: *${todayCount}*\n🤖 AI: Groq active\n📡 Meta API: connected`
    } catch {
      reply = 'Unable to fetch status right now.'
    }

  } else if (intent.intent === 'lead_search') {
    reply = `I can find leads! Please specify:\n• *Business type* (e.g. restaurant, gym, dental clinic)\n• *City* (e.g. Mumbai, Delhi, Bangalore)\n\nExample: "Find plumbers in Pune"`

  } else {
    try {
      reply = await callAI(
        `You are Levitate AI, a WhatsApp assistant for a lead generation platform for Indian businesses. Keep replies under 80 words. Be helpful and brief.`,
        text,
        150,
        'meta-general'
      )
      reply = reply.trim()
    } catch {
      reply = `Ask me to find business leads — e.g. "Find restaurants in Mumbai" or "Get dental clinics in Pune".`
    }
  }

  if (reply) {
    await sendWA(from, reply)
    logMessage(from, text, reply, intent.intent).catch(() => {})
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
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
        // SYNCHRONOUS — await so Netlify doesn't kill it before completion
        await processMessage(msg.from, msg.text.body.trim(), msg.id).catch(e =>
          console.error('[WA] processMessage error:', e)
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
