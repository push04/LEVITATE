/**
 * Netlify Scheduled Function — Hourly WhatsApp Update
 * Runs every hour. Sends a WhatsApp message to the owner with:
 *   - New leads in the last hour
 *   - Source breakdown
 *   - Top cities/categories
 *
 * Requires env vars:
 *   WHATSAPP_ACCESS_TOKEN    — Meta Cloud API access token (NEVER hardcode)
 *   WHATSAPP_PHONE_NUMBER_ID — Meta Phone Number ID (e.g. 1107801055757202)
 *   OWNER_WHATSAPP_NUMBER    — owner's WhatsApp number e.g. 916299549112
 *
 * NOTE: Sending unsolicited messages requires an approved Meta message template.
 * If you have a template named 'levitate_hourly_update', configure WHATSAPP_TEMPLATE_HOURLY=levitate_hourly_update.
 * Otherwise, this works within the 24-hour session window (after owner messages the bot).
 */

import { getServiceSupabase } from '../../src/lib/supabase.js'

export const config = { schedule: '0 * * * *' }

async function sendMetaWhatsApp(to: string, message: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    console.warn('[WA-Hourly] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set')
    return false
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error(`[WA-Hourly] Meta API error ${res.status}:`, err.slice(0, 300))
    return false
  }

  return true
}

export default async (): Promise<Response> => {
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER
  if (!ownerNumber) {
    console.warn('[WA-Hourly] OWNER_WHATSAPP_NUMBER not set — skipping')
    return new Response('skip — no owner number')
  }

  const supabase = getServiceSupabase()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Leads added in the last hour
  const { data: newLeads, error } = await supabase
    .from('potential_leads')
    .select('business_name, city, category, source:raw_data->>source, ai_score')
    .gte('created_at', oneHourAgo)
    .order('ai_score', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[WA-Hourly] Supabase error:', error)
    return new Response('error', { status: 500 })
  }

  const leads = newLeads ?? []
  const count = leads.length

  if (count === 0) {
    console.log('[WA-Hourly] No new leads this hour — skipping message')
    return new Response('ok — no new leads')
  }

  // Source breakdown
  const sources: Record<string, number> = {}
  const cities: Record<string, number> = {}
  const categories: Record<string, number> = {}

  for (const l of leads) {
    const src = String(l.source ?? 'unknown')
    sources[src] = (sources[src] ?? 0) + 1
    const city = String(l.city ?? 'unknown')
    cities[city] = (cities[city] ?? 0) + 1
    const cat = String(l.category ?? 'unknown')
    categories[cat] = (categories[cat] ?? 0) + 1
  }

  const topSources = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(', ')
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(', ')
  const topCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(', ')

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })

  const message = [
    `*Levitate Labs — Hourly Update* (${now} IST)`,
    '',
    `*${count} new lead${count !== 1 ? 's' : ''}* found in the last hour`,
    '',
    `Sources: ${topSources}`,
    `Cities: ${topCities}`,
    `Categories: ${topCats}`,
    '',
    leads.length > 0 && leads[0].business_name
      ? `Top lead: *${leads[0].business_name}* (${leads[0].city ?? ''}) — score ${leads[0].ai_score ?? 0}`
      : null,
  ].filter(Boolean).join('\n')

  const sent = await sendMetaWhatsApp(ownerNumber, message)
  console.log(`[WA-Hourly] Sent=${sent}, leads=${count}`)
  return new Response(`ok — ${count} leads, sent=${sent}`)
}
