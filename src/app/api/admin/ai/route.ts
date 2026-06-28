import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { callAI } from '@/lib/ai/router'

interface Action {
  type: 'navigate' | 'copy'
  label: string
  href?: string
  content?: string
}

function parseActions(text: string): { clean: string; actions: Action[] } {
  const match = text.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/i)
  if (!match) return { clean: text.trim(), actions: [] }
  const clean = text.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/i, '').trim()
  const actions: Action[] = []
  for (const line of match[1].trim().split('\n').filter(Boolean)) {
    try {
      const a = JSON.parse(line.trim())
      if (a.type && a.label) actions.push(a)
    } catch { /* skip malformed */ }
  }
  return { clean, actions: actions.slice(0, 4) }
}

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth(req)
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { message: string; history?: Array<{ role: string; content: string }> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { message, history = [] } = body
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

  const supabase = getServiceSupabase()
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  // Fetch everything in parallel — errors per query are handled via data ?? []
  const [
    leadsRes, projectsRes, revenueRes, invoicesRes, companiesRes,
    potLeadsRes, potLeadsCountRes, waQueueRes, waCampaignsRes, waMessagesRes,
    intakeRes, agentLogsRes, agentRewardsRes, profilesRes,
    bizCrmCountRes, dripRes,
  ] = await Promise.all([
    supabase.from('leads').select('id,status,score,business_name,city,service_category,created_at,estimated_value,outreach_count,email,phone').order('created_at', { ascending: false }).limit(60),
    supabase.from('projects').select('id,name,status,type,advance_amount,final_amount,created_at').order('created_at', { ascending: false }).limit(25),
    supabase.from('revenue').select('amount,received_at,description').order('received_at', { ascending: false }).limit(60),
    supabase.from('invoices').select('total,status,created_at').limit(30),
    supabase.from('companies').select('id,name,website,plan_name,subscription_status,created_at').order('created_at', { ascending: false }).limit(40),
    supabase.from('potential_leads').select('id,business_name,city,category,ai_score,phone,website').order('ai_score', { ascending: false }).limit(25),
    supabase.from('potential_leads').select('id', { count: 'exact', head: true }),
    supabase.from('whatsapp_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('company_whatsapp_campaigns').select('name,status,total_recipients,sent_count,delivered_count,reply_count,created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('company_whatsapp_messages').select('id', { count: 'exact', head: true }),
    supabase.from('intake_responses').select('business_name,service_interest,city,budget,created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('agent_logs').select('agent_name,action,status,ai_provider,duration_ms,created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('agent_rewards').select('agent_name,current_balance,total_earned,is_suspended').order('current_balance', { ascending: false }).limit(15),
    supabase.from('profiles').select('id,full_name,role,email,status').limit(25),
    supabase.from('company_crm_leads').select('id', { count: 'exact', head: true }),
    supabase.from('drip_sequences').select('id,name,status,total_contacts,emails_sent').order('created_at', { ascending: false }).limit(10),
  ])

  const leads         = leadsRes.data ?? []
  const projects      = projectsRes.data ?? []
  const revenues      = revenueRes.data ?? []
  const companies     = companiesRes.data ?? []
  const potLeads      = potLeadsRes.data ?? []
  const potLeadsTotal = potLeadsCountRes.count ?? 0
  const waQueuePending = waQueueRes.count ?? 0
  const waCampaigns   = waCampaignsRes.data ?? []
  const waMessages    = waMessagesRes.count ?? 0
  const intakes       = intakeRes.data ?? []
  const agentLogs     = agentLogsRes.data ?? []
  const agentRewards  = agentRewardsRes.data ?? []
  const profiles      = profilesRes.data ?? []
  const bizCrmCount   = bizCrmCountRes.count ?? 0
  const drips         = dripRes.data ?? []

  // Revenue calcs
  const sumAmt = (arr: { amount: unknown }[]) => arr.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const totalRevenue  = sumAmt(revenues)
  const monthRevenue  = sumAmt(revenues.filter(r => new Date(r.received_at) >= monthStart))
  const weekRevenue   = sumAmt(revenues.filter(r => new Date(r.received_at) >= weekStart))
  const todayRevenue  = sumAmt(revenues.filter(r => new Date(r.received_at) >= todayStart))
  const invoices      = invoicesRes.data ?? []
  const pendingInvoices = invoices.filter(i => i.status === 'sent')
  const pendingRevenue  = pendingInvoices.reduce((s, i) => s + Number(i.total ?? 0), 0)

  // Lead funnel
  const leadStatus: Record<string, number> = {}
  for (const l of leads) { const k = l.status || 'new'; leadStatus[k] = (leadStatus[k] ?? 0) + 1 }
  const newToday = leads.filter(l => new Date(l.created_at) >= todayStart).length
  const newThisWeek = leads.filter(l => new Date(l.created_at) >= weekStart).length
  const hotLeads = leads.filter(l => (l.score ?? 0) >= 6 && ['new', 'contacted'].includes(l.status ?? '')).slice(0, 12)
  const highValueLeads = leads.filter(l => Number(l.estimated_value ?? 0) > 0).sort((a, b) => Number(b.estimated_value) - Number(a.estimated_value)).slice(0, 8)
  const cityCount: Record<string, number> = {}
  for (const l of leads) { if (l.city) cityCount[l.city] = (cityCount[l.city] ?? 0) + 1 }
  const topCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c}(${n})`).join(', ')
  const categoryCount: Record<string, number> = {}
  for (const l of leads) { if (l.service_category) categoryCount[l.service_category] = (categoryCount[l.service_category] ?? 0) + 1 }
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, n]) => `${c}(${n})`).join(', ')

  // Projects
  const activeProjects = projects.filter(p => !['delivered', 'closed'].includes(p.status ?? ''))
  const projectValue = projects.reduce((s, p) => s + Number(p.advance_amount ?? 0) + Number(p.final_amount ?? 0), 0)

  // Agents
  const suspendedAgents = agentRewards.filter(a => a.is_suspended).length
  const recentErrors = agentLogs.filter(l => l.status === 'error' || l.status === 'failed').length

  // Format lists
  const fmtLeads = leads.slice(0, 15).map(l =>
    `• ${l.business_name || '?'} | ${l.city || '?'} | ${l.service_category || '?'} | ${l.status || 'new'} | score:${l.score ?? 0}${l.estimated_value ? ` | ₹${l.estimated_value}` : ''}${l.outreach_count ? ` | outreach:${l.outreach_count}` : ''}`
  ).join('\n')

  const fmtHot = hotLeads.map(l =>
    `• ${l.business_name || '?'} | ${l.city || '?'} | ${l.service_category || '?'} | score:${l.score ?? 0} | ${l.phone || l.email || 'no contact'}`
  ).join('\n')

  const fmtHighValue = highValueLeads.map(l =>
    `• ${l.business_name || '?'} | ${l.city || '?'} | ₹${Number(l.estimated_value).toLocaleString('en-IN')} | ${l.status || 'new'}`
  ).join('\n')

  const fmtPotLeads = potLeads.slice(0, 10).map(l =>
    `• ${l.business_name || '?'} | ${l.city || '?'} | ${l.category || '?'} | ai_score:${l.ai_score ?? 0}${l.phone ? ` | ${l.phone}` : ''}`
  ).join('\n')

  const fmtCampaigns = waCampaigns.slice(0, 8).map(c =>
    `• ${c.name}: ${c.status} | ${c.total_recipients ?? 0} recipients | ${c.delivered_count ?? 0} delivered | ${c.reply_count ?? 0} replies`
  ).join('\n')

  const fmtCompanies = companies.slice(0, 12).map(c =>
    `• ${c.name || '?'} | plan:${c.plan_name || 'none'} | status:${c.subscription_status || 'inactive'}`
  ).join('\n')

  const fmtIntakes = intakes.slice(0, 8).map(i =>
    `• ${i.business_name || '?'} | ${i.city || '?'} | service:${i.service_interest || '?'} | budget:${i.budget || '?'}`
  ).join('\n')

  const fmtAgents = agentRewards.map(a =>
    `• ${a.agent_name}: balance=₹${a.current_balance} | earned=₹${a.total_earned} | ${a.is_suspended ? '⛔ SUSPENDED' : '✅ active'}`
  ).join('\n')

  const fmtDrips = drips.map(d =>
    `• ${d.name || '?'}: ${d.status || '?'} | contacts:${d.total_contacts ?? 0} | emails_sent:${d.emails_sent ?? 0}`
  ).join('\n')

  const system = `You are LEVITATE's Master Admin AI — the most powerful intelligence in this system.
You have FULL real-time visibility into every corner of Levitate Labs' operations.
You serve Pushpal Nara (founder), acting as elite business strategist + analyst + content engine.

TODAY: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

══════════ FINANCIAL OVERVIEW ══════════
Revenue today:        ₹${todayRevenue.toLocaleString('en-IN')}
Revenue this week:    ₹${weekRevenue.toLocaleString('en-IN')}
Revenue this month:   ₹${monthRevenue.toLocaleString('en-IN')}
Total all-time:       ₹${totalRevenue.toLocaleString('en-IN')}
Pending invoices:     ₹${pendingRevenue.toLocaleString('en-IN')} (${pendingInvoices.length} unsettled)
Active projects:      ${activeProjects.length}  |  Total project value: ₹${projectValue.toLocaleString('en-IN')}

══════════ LEAD PIPELINE ══════════
Total leads (admin CRM):  ${leads.length}
New today: ${newToday}  |  New this week: ${newThisWeek}
Funnel: ${Object.entries(leadStatus).map(([s, n]) => `${s}:${n}`).join(' | ')}
Hot leads (score≥6, active): ${hotLeads.length}
Top cities: ${topCities || 'no data'}
Top categories: ${topCategories || 'no data'}

Recent leads (last 15):
${fmtLeads || 'None'}

Hot leads needing action:
${fmtHot || 'None'}

High-value leads (by ₹):
${fmtHighValue || 'None'}

══════════ AI LEAD DATABASE ══════════
Total potential leads: ${potLeadsTotal}
Top AI-scored:
${fmtPotLeads || 'None'}

══════════ PLATFORM CLIENTS ══════════
Total business clients: ${companies.length}
Business CRM leads (across all clients): ${bizCrmCount}
${fmtCompanies || 'No clients yet'}

══════════ WHATSAPP ══════════
Queue pending: ${waQueuePending}  |  Total messages (all clients): ${waMessages}
Campaigns (last 10):
${fmtCampaigns || 'None'}

══════════ EMAIL DRIPS ══════════
${fmtDrips || 'No drip sequences'}

══════════ INTAKE RESPONSES ══════════
${fmtIntakes || 'None'}

══════════ AGENT HEALTH ══════════
${fmtAgents || 'No agents'}
Suspended: ${suspendedAgents}  |  Recent errors (last 20 logs): ${recentErrors}

══════════ TEAM ══════════
${profiles.map(p => `• ${p.full_name || '?'} | ${p.role} | ${p.status || 'active'}`).join('\n') || 'No team data'}

══════════ YOUR CAPABILITIES ══════════
You can help with ANY of these:
1. ANALYTICS — Funnel analysis, revenue trends, city/category breakdowns, campaign ROI, cohort analysis
2. LEAD INTELLIGENCE — Score leads, prioritize follow-ups, identify stalled deals, uncover patterns
3. CONTENT GENERATION — Cold emails (full, ready-to-send), WhatsApp messages, LinkedIn posts, blog posts, proposals, pitch decks outlines
4. GROWTH STRATEGY — Ideal customer profiles, outreach sequences, market opportunities, pricing, retention
5. OPERATIONS — Agent health diagnostics, queue management, intake qualification, platform status
6. REPORTING — Full weekly/monthly summaries, pipeline reports, performance benchmarks
7. PLATFORM INTELLIGENCE — Client health, subscription analysis, churn risk, upsell opportunities

RESPONSE RULES:
- Be direct and data-driven. Reference actual numbers. Be specific — not generic advice.
- For content (emails, messages, posts): write the complete, ready-to-use content.
- Use **bold** for key metrics/names. Use bullet lists. Be concise but complete.
- When writing content, go as long as needed to produce quality output.
- For analysis, target 150–300 words. For content generation, go longer.
- Number actionable steps clearly.
- OPTIONALLY: if there are 1–3 genuinely useful follow-up actions, append this block at the very end:
[ACTIONS]
{"type":"navigate","label":"View hot leads","href":"/admin/dashboard/leads"}
{"type":"copy","label":"Copy this email","content":"FULL CONTENT HERE"}
[/ACTIONS]
Only include [ACTIONS] when it genuinely helps. Max 3 actions.`

  const historyText = history.slice(-12).map(m =>
    `${m.role === 'user' ? 'Pushpal' : 'AI'}: ${m.content}`
  ).join('\n')

  const userPrompt = historyText ? `${historyText}\nPushpal: ${message}` : `Pushpal: ${message}`

  try {
    const raw = await callAI(system, userPrompt, 1400, 'admin-ai')
    const { clean: reply, actions } = parseActions(raw)
    return NextResponse.json({ reply: reply.trim(), actions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'AI unavailable', detail: msg.slice(0, 200) }, { status: 500 })
  }
}
