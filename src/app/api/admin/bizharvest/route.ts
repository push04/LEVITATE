import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getServiceSupabase()

  const [leadsRes, targetsRes, logsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, source, city, category, phone, website, created_at')
      .like('source', 'bizharvest_%'),

    supabase
      .from('bizharvest_targets')
      .select('id, city, business_type, priority, is_active'),

    supabase
      .from('agent_logs')
      .select('id, status, output, created_at')
      .eq('agent_name', 'bizharvest')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const leads = leadsRes.data ?? []
  const targets = targetsRes.data ?? []
  const logs = logsRes.data ?? []

  // WhatsApp: every bizharvest lead with a phone gets queued — no separate tracking column
  const whatsappQueued = leads.filter(l => l.phone).length

  // Summary
  const total = leads.length
  const withPhone = leads.filter(l => l.phone).length
  const withWebsite = leads.filter(l => l.website).length
  const gmaps = leads.filter(l => l.source === 'bizharvest_gmaps').length
  const justdial = leads.filter(l => l.source === 'bizharvest_justdial').length

  // By city (top 15)
  const cityMap: Record<string, number> = {}
  leads.forEach(l => { if (l.city) cityMap[l.city] = (cityMap[l.city] ?? 0) + 1 })
  const topCities = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([city, count]) => ({ city, count }))

  // By category (top 15)
  const catMap: Record<string, number> = {}
  leads.forEach(l => { if (l.category) catMap[l.category] = (catMap[l.category] ?? 0) + 1 })
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([category, count]) => ({ category, count }))

  // Last 14 days trend
  const now = Date.now()
  const dayMs = 86400000
  const trend = Array.from({ length: 14 }, (_, i) => {
    const dayStart = new Date(now - (13 - i) * dayMs)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + dayMs)
    return {
      date: dayStart.toISOString().slice(0, 10),
      count: leads.filter(l => {
        const t = new Date(l.created_at).getTime()
        return t >= dayStart.getTime() && t < dayEnd.getTime()
      }).length,
    }
  })

  // Target coverage: how many active targets have scraped leads
  const scrapedCityCat = new Set(leads.map(l => `${l.city}|${l.category}`))
  const activeTargets = targets.filter(t => t.is_active)
  const coveredTargets = activeTargets.filter(t =>
    scrapedCityCat.has(`${t.city}|${t.business_type}`)
  ).length

  // Recent logs
  const recentLogs = logs.slice(0, 10).map(l => ({
    id: l.id,
    status: l.status,
    inserted: (l.output as any)?.inserted ?? 0,
    skipped: (l.output as any)?.skipped ?? 0,
    errors: (l.output as any)?.errors ?? 0,
    created_at: l.created_at,
  }))

  // WhatsApp
  const wq = whatsappRes.data ?? []
  const wqSent = wq.filter(w => w.status === 'sent').length
  const wqPending = wq.filter(w => w.status === 'pending').length

  return NextResponse.json({
    summary: { total, withPhone, withWebsite, gmaps, justdial },
    targets: { total: targets.length, active: activeTargets.length, covered: coveredTargets },
    topCities,
    topCategories,
    trend,
    recentLogs,
    whatsapp: { queued: whatsappQueued },
  })
}
