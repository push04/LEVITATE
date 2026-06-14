import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { callAI } from '@/lib/ai/router'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  let context: Awaited<ReturnType<typeof getBusinessApiContext>>
  try {
    context = await getBusinessApiContext()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'Active subscription required' || msg.includes('feature is not enabled')) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const company_id = context.portal.companyId

  let body: { message: string; history?: ChatMessage[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { message, history = [] } = body
  if (!message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = getServiceSupabase()

  // Parallel context fetch — all non-blocking, failures just return null
  const [
    companyRes, leadsCountRes, recentLeadsRes, campaignsRes, configRes,
    statusBreakdownRes, cityBreakdownRes, msgStatsRes,
  ] = await Promise.all([
    supabase.from('companies').select('name,website').eq('id', company_id).maybeSingle(),
    supabase.from('company_crm_leads').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
    supabase.from('company_crm_leads').select('name,company_name,city,service_category,status,estimated_value,email,phone').eq('company_id', company_id).order('created_at', { ascending: false }).limit(15),
    supabase.from('company_whatsapp_campaigns').select('name,status,total_recipients,sent_count,delivered_count,reply_count,created_at').eq('company_id', company_id).order('created_at', { ascending: false }).limit(5),
    supabase.from('company_whatsapp_config').select('connected,ai_agent_enabled,whatsapp_number').eq('company_id', company_id).maybeSingle(),
    supabase.from('company_crm_leads').select('status').eq('company_id', company_id),
    supabase.from('company_crm_leads').select('city').eq('company_id', company_id).not('city', 'is', null),
    supabase.from('company_whatsapp_messages').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
  ])

  // Crunch lead stats
  const leadsTotal = leadsCountRes.count ?? 0
  const statusCount: Record<string, number> = {}
  for (const r of (statusBreakdownRes.data ?? [])) {
    const s = (r.status as string) || 'New'
    statusCount[s] = (statusCount[s] ?? 0) + 1
  }
  const cityCount: Record<string, number> = {}
  for (const r of (cityBreakdownRes.data ?? [])) {
    if (r.city) cityCount[r.city as string] = (cityCount[r.city as string] ?? 0) + 1
  }
  const topCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([c, n]) => `${c}(${n})`).join(', ')

  const recentLeadsList = (recentLeadsRes.data ?? []).slice(0, 10).map(l =>
    `• ${l.company_name || l.name || '?'} — ${l.city || ''} ${l.service_category || ''} [${l.status || 'new'}]${l.estimated_value ? ` ₹${l.estimated_value}` : ''}`
  ).join('\n')

  const campaignsList = (campaignsRes.data ?? []).map(c =>
    `• ${c.name}: ${c.status}, ${c.total_recipients} recipients, ${c.delivered_count ?? 0} delivered, ${c.reply_count ?? 0} replies`
  ).join('\n')

  const co = companyRes.data
  const cfg = configRes.data

  const system = `You are LEVITATE's AI business assistant for ${co?.name ?? 'this business'}.
Help them grow using their CRM data, WhatsApp automation, and actionable growth strategies.
Always be concise, data-driven, and specific to their actual numbers below.

BUSINESS CONTEXT:
Company: ${co?.name ?? '?'} | Website: ${co?.website ?? 'unknown'}

CRM / LEADS:
Total CRM leads: ${leadsTotal}
Status breakdown: ${Object.entries(statusCount).map(([s, n]) => `${s}: ${n}`).join(', ') || 'none'}
Top cities: ${topCities || 'no data'}
Recent leads:
${recentLeadsList || 'No CRM leads yet'}

WHATSAPP:
Connected: ${cfg?.connected ? 'Yes' : 'No'} | Number: ${cfg?.whatsapp_number ?? 'not set'}
AI agent: ${cfg?.ai_agent_enabled ? 'Enabled' : 'Disabled'}
Total messages: ${msgStatsRes.count ?? 0}
Recent campaigns:
${campaignsList || 'No campaigns yet'}

CAPABILITIES:
1. CRM analysis - top customers, city breakdown, conversion rates, follow-up suggestions
2. WhatsApp campaign strategy - segment recommendations, message ideas, timing
3. Lead pipeline advice - which leads to prioritize, what to say
4. Business growth - strategies specific to their industry
5. Platform how-to - explain how to use LEVITATE features

IMPORTANT: Only use data above. Never invent numbers. If you don't know something, say so.
Keep replies under 200 words. Use plain text only - no markdown, no asterisks, no stars.
For lists use numbered format like "1. item" or plain lines with a dash "- item". Be direct and actionable.`

  const historyText = history.slice(-8).map(m =>
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n')

  const userPrompt = historyText
    ? `${historyText}\nUser: ${message}`
    : `User: ${message}`

  try {
    const reply = await callAI(system, userPrompt, 500, 'business-chat')
    return NextResponse.json({ reply: reply.trim() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'AI unavailable', detail: msg.slice(0, 200) }, { status: 500 })
  }
}
