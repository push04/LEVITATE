/**
 * Netlify Scheduled Function — Daily WhatsApp Business Summary
 * Runs every day at 8:00 AM IST (2:30 AM UTC).
 *
 * Sends a comprehensive daily summary via WhatsApp:
 *   - Total leads (all-time + last 24h)
 *   - CRM pipeline breakdown
 *   - Active automations
 *   - AI-generated business insight (via Groq)
 *
 * Requires env vars:
 *   WHATSAPP_ACCESS_TOKEN    — Meta Cloud API access token
 *   WHATSAPP_PHONE_NUMBER_ID — Meta Phone Number ID
 *   OWNER_WHATSAPP_NUMBER    — owner's WhatsApp number e.g. 916299549112
 *   GROQ_API_KEY             — for AI-generated summary
 *   SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL — DB access
 */

import { getServiceSupabase } from '../../src/lib/supabase.js'

// 8:00 AM IST = 2:30 AM UTC
export const config = { schedule: '30 2 * * *' }

async function sendMetaWhatsApp(to: string, message: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    console.warn('[WA-Daily] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set')
    return false
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error(`[WA-Daily] Meta API error ${res.status}:`, err.slice(0, 300))
    return false
  }
  return true
}

async function groqInsight(stats: {
  totalLeads: number
  newToday: number
  crmOpen: number
  crmWon: number
  topCity: string
  topCategory: string
}): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) return ''

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You write short, sharp WhatsApp business insights for Indian MSMEs. 2-3 sentences max. Practical and actionable. No markdown, no asterisks.',
          },
          {
            role: 'user',
            content: `Daily stats: ${stats.newToday} new leads today, ${stats.totalLeads} total in DB, ${stats.crmOpen} open CRM deals, ${stats.crmWon} won. Top activity: ${stats.topCity} / ${stats.topCategory}. Write a short actionable insight for the business owner.`,
          },
        ],
        max_tokens: 120,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return ''
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content?.trim() ?? ''
  } catch {
    return ''
  }
}

export default async (): Promise<Response> => {
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER
  if (!ownerNumber) {
    console.warn('[WA-Daily] OWNER_WHATSAPP_NUMBER not set — skipping')
    return new Response('skip — no owner number')
  }

  const supabase = getServiceSupabase()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    totalRes,
    todayRes,
    crmRes,
    topCityRes,
    queueRes,
  ] = await Promise.allSettled([
    // Total leads all-time
    supabase.from('potential_leads').select('id', { count: 'exact', head: true }),
    // Leads added in last 24h with city/category breakdown
    supabase
      .from('potential_leads')
      .select('city, category, ai_score')
      .gte('created_at', oneDayAgo),
    // CRM pipeline summary
    supabase
      .from('company_crm_leads')
      .select('status, pipeline_stage'),
    // Top city/category in last 24h
    supabase
      .from('potential_leads')
      .select('city, category')
      .gte('created_at', oneDayAgo)
      .limit(100),
    // WhatsApp queue pending
    supabase
      .from('whatsapp_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const totalLeads = totalRes.status === 'fulfilled' ? (totalRes.value.count ?? 0) : 0
  const todayLeads = todayRes.status === 'fulfilled' ? (todayRes.value.data ?? []) : []
  const crmLeads = crmRes.status === 'fulfilled' ? (crmRes.value.data ?? []) : []
  const queueCount = queueRes.status === 'fulfilled' ? (queueRes.value.count ?? 0) : 0

  const newToday = todayLeads.length

  // CRM breakdown
  const crmOpen = crmLeads.filter(l => !['won', 'lost', 'closed'].includes(String(l.status ?? '').toLowerCase())).length
  const crmWon = crmLeads.filter(l => ['won', 'closed'].includes(String(l.status ?? '').toLowerCase())).length
  const crmTotal = crmLeads.length

  // Top city/category
  const cityCounts: Record<string, number> = {}
  const catCounts: Record<string, number> = {}
  for (const l of todayLeads) {
    const city = String(l.city ?? 'unknown')
    const cat = String(l.category ?? 'unknown')
    cityCounts[city] = (cityCounts[city] ?? 0) + 1
    catCounts[cat] = (catCounts[cat] ?? 0) + 1
  }
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

  const avgScore = todayLeads.length > 0
    ? Math.round(todayLeads.reduce((s, l) => s + (Number(l.ai_score) || 0), 0) / todayLeads.length)
    : 0

  // AI insight
  const insight = await groqInsight({ totalLeads, newToday, crmOpen, crmWon, topCity, topCategory })

  const date = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short' })

  const lines = [
    `*Levitate Labs — Daily Report* (${date})`,
    '',
    `*Lead Pipeline*`,
    `• New today: *${newToday}* (avg score ${avgScore})`,
    `• All-time total: *${totalLeads.toLocaleString('en-IN')}*`,
    `• Top city: ${topCity} | Top category: ${topCategory}`,
    '',
    `*CRM*`,
    `• Total deals: ${crmTotal} | Open: ${crmOpen} | Won: ${crmWon}`,
    '',
    `*WhatsApp Queue*`,
    `• Pending messages: ${queueCount}`,
  ]

  if (insight) {
    lines.push('', `*AI Insight*`, insight)
  }

  const message = lines.join('\n')

  const sent = await sendMetaWhatsApp(ownerNumber, message)
  console.log(`[WA-Daily] Sent=${sent}, newToday=${newToday}, total=${totalLeads}`)
  return new Response(`ok — sent=${sent}`)
}
