import { fetchAllRows, getServiceSupabase } from '@/lib/supabase'

interface BizHarvestNotes {
  rating?: number
  review_count?: number
  years_active?: string
  working_hours?: unknown
  maps_url?: string
  query_term?: string
  scraped_at?: string
  pin_code?: string
  address?: string
}

function parseNotes(notes: string | null): BizHarvestNotes {
  if (!notes) return {}
  try {
    return JSON.parse(notes) as BizHarvestNotes
  } catch {
    return {}
  }
}

export async function getBizharvestAnalytics(supabase: ReturnType<typeof getServiceSupabase>) {
  const [leadsRaw, targetsRes, logsRes] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('leads')
        .select('id, name, business_name, source, city, service_category, phone, website_link, status, notes, deal_value, created_at')
        .like('source', 'bizharvest_%')
        .order('created_at', { ascending: false })
        .range(from, to)
    ).catch((err) => {
      console.error('[bizharvest] leads error:', err.message)
      return []
    }),

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

  if (targetsRes.error) console.error('[bizharvest] targets error:', targetsRes.error.message)
  if (logsRes.error) console.error('[bizharvest] logs error:', logsRes.error.message)

  const targets = targetsRes.data ?? []
  const logs = logsRes.data ?? []

  // Enrich each lead with the details BizHarvest stashed in `notes` (rating, reviews, address, ...)
  const leads = leadsRaw.map(l => ({ ...l, meta: parseNotes(l.notes) }))

  // Summary
  const total = leads.length
  const withPhone = leads.filter(l => l.phone).length
  const withWebsite = leads.filter(l => l.website_link).length
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
  leads.forEach(l => { if (l.service_category) catMap[l.service_category] = (catMap[l.service_category] ?? 0) + 1 })
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
  const scrapedCityCat = new Set(leads.map(l => `${l.city}|${l.service_category}`))
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

  // ── Sales pipeline: where bizharvest leads are in the CRM funnel ─────────
  const pipeline = {
    New: leads.filter(l => l.status === 'New').length,
    Contacted: leads.filter(l => l.status === 'Contacted').length,
    'Follow Up': leads.filter(l => l.status === 'Follow Up').length,
    Closed: leads.filter(l => l.status === 'Closed').length,
  }

  // ── Ratings (Google Maps / JustDial star ratings scraped per business) ───
  const rated = leads.filter(l => typeof l.meta.rating === 'number' && (l.meta.rating as number) > 0)
  const avgRating = rated.length
    ? Math.round((rated.reduce((s, l) => s + (l.meta.rating as number), 0) / rated.length) * 10) / 10
    : 0

  const ratingBuckets = [
    { bucket: '4.5+', min: 4.5, max: 5.01 },
    { bucket: '4.0 - 4.49', min: 4.0, max: 4.5 },
    { bucket: '3.0 - 3.99', min: 3.0, max: 4.0 },
    { bucket: '< 3.0', min: 0, max: 3.0 },
  ]
  const ratingDistribution = ratingBuckets.map(b => ({
    bucket: b.bucket,
    count: rated.filter(l => (l.meta.rating as number) >= b.min && (l.meta.rating as number) < b.max).length,
  }))
  ratingDistribution.push({
    bucket: 'No rating',
    count: leads.length - rated.length,
  })

  const topRated = [...rated]
    .sort((a, b) => (b.meta.rating! - a.meta.rating!) || ((b.meta.review_count ?? 0) - (a.meta.review_count ?? 0)))
    .slice(0, 10)
    .map(l => ({
      id: l.id,
      name: l.business_name || l.name,
      city: l.city,
      category: l.service_category,
      rating: l.meta.rating,
      reviewCount: l.meta.review_count ?? 0,
      phone: l.phone,
      source: l.source,
    }))

  // ── Client directory: most recent scraped businesses, full detail ────────
  const recentLeads = leads.slice(0, 40).map(l => ({
    id: l.id,
    name: l.business_name || l.name,
    city: l.city,
    category: l.service_category,
    phone: l.phone,
    website: l.website_link,
    status: l.status,
    rating: l.meta.rating ?? null,
    reviewCount: l.meta.review_count ?? null,
    dealValue: l.deal_value,
    source: l.source === 'bizharvest_gmaps' ? 'gmaps' : l.source === 'bizharvest_justdial' ? 'justdial' : l.source,
    createdAt: l.created_at,
  }))

  const distinctCities = Object.keys(cityMap).length
  const distinctCategories = Object.keys(catMap).length

  return {
    summary: { total, withPhone, withWebsite, gmaps, justdial, distinctCities, distinctCategories, avgRating },
    targets: { total: targets.length, active: activeTargets.length, covered: coveredTargets },
    topCities,
    topCategories,
    trend,
    recentLogs,
    whatsapp: { queued: withPhone },
    pipeline,
    ratings: { average: avgRating, rated: rated.length, distribution: ratingDistribution, topRated },
    recentLeads,
  }
}

export type BizharvestAnalytics = Awaited<ReturnType<typeof getBizharvestAnalytics>>
