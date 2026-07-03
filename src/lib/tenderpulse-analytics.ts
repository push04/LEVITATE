import { fetchAllRows, getServiceSupabase } from '@/lib/supabase'

export interface TenderRow {
  id: string
  source_id: string
  external_ref: string
  title: string
  organization: string | null
  district: string | null
  category: string | null
  estimated_value_inr: number | null
  emd_amount_inr: number | null
  publish_date: string | null
  bid_submission_deadline: string | null
  nit_document_url: string | null
  ai_summary: string | null
  status: string
  notes: string | null
  tags: string[] | null
  is_hidden: boolean
  created_at: string
  updated_at: string
  sources?: { name: string; family: string; state: string } | null
}

const TENDER_SELECT =
  'id, source_id, external_ref, title, organization, district, category, estimated_value_inr, emd_amount_inr, publish_date, bid_submission_deadline, nit_document_url, ai_summary, status, notes, tags, is_hidden, created_at, updated_at, sources(name, family, state)'

export async function getAllTenders(supabase: ReturnType<typeof getServiceSupabase>): Promise<TenderRow[]> {
  const rows = await fetchAllRows<TenderRow>((from, to) =>
    supabase
      .from('tenders')
      .select(TENDER_SELECT)
      .order('bid_submission_deadline', { ascending: true, nullsFirst: false })
      .range(from, to) as unknown as PromiseLike<{ data: TenderRow[] | null; error: { message: string } | null }>
  )
  return rows
}

export function buildTenderAnalytics(tenders: TenderRow[]) {
  const visible = tenders.filter((t) => !t.is_hidden)
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  const byCategory: Record<string, number> = {}
  const byDistrict: Record<string, number> = {}
  const byState: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  const byDay: Record<string, number> = {}
  const deadlineBuckets = { overdue: 0, due_0_2d: 0, due_3_7d: 0, due_8_30d: 0, due_30d_plus: 0, no_deadline: 0 }

  for (const t of visible) {
    const cat = t.category || 'other'
    byCategory[cat] = (byCategory[cat] || 0) + 1

    const district = t.district || 'Unknown'
    byDistrict[district] = (byDistrict[district] || 0) + 1

    const state = t.sources?.state || 'Unknown'
    byState[state] = (byState[state] || 0) + 1

    const source = t.sources?.name || 'Unknown'
    bySource[source] = (bySource[source] || 0) + 1

    const day = (t.created_at || '').slice(0, 10)
    if (day) byDay[day] = (byDay[day] || 0) + 1

    if (!t.bid_submission_deadline) {
      deadlineBuckets.no_deadline++
    } else {
      const deadline = new Date(t.bid_submission_deadline).getTime()
      const daysLeft = (deadline - now) / DAY
      if (deadline < now) deadlineBuckets.overdue++
      else if (daysLeft <= 2) deadlineBuckets.due_0_2d++
      else if (daysLeft <= 7) deadlineBuckets.due_3_7d++
      else if (daysLeft <= 30) deadlineBuckets.due_8_30d++
      else deadlineBuckets.due_30d_plus++
    }
  }

  const topOrganizations = Object.entries(
    visible.reduce<Record<string, number>>((acc, t) => {
      const org = t.organization || 'Unknown'
      acc[org] = (acc[org] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  return {
    total: visible.length,
    hidden: tenders.length - visible.length,
    upcomingDeadlines7d: deadlineBuckets.due_0_2d + deadlineBuckets.due_3_7d,
    expired: deadlineBuckets.overdue,
    noDeadline: deadlineBuckets.no_deadline,
    byCategory: sortEntries(byCategory),
    byDistrict: sortEntries(byDistrict).slice(0, 20),
    byState: sortEntries(byState),
    bySource: sortEntries(bySource),
    byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)),
    topOrganizations,
    deadlineBuckets: [
      { name: 'Overdue', count: deadlineBuckets.overdue },
      { name: 'Due in 0-2 days', count: deadlineBuckets.due_0_2d },
      { name: 'Due in 3-7 days', count: deadlineBuckets.due_3_7d },
      { name: 'Due in 8-30 days', count: deadlineBuckets.due_8_30d },
      { name: 'Due in 30+ days', count: deadlineBuckets.due_30d_plus },
      { name: 'No deadline listed', count: deadlineBuckets.no_deadline },
    ],
  }
}

function sortEntries(obj: Record<string, number>) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
}

// "Smart sort" — a composite relevance/urgency score blending deadline
// pressure with data completeness, so the most actionable tenders (soon due,
// well-described, categorized) surface first without a per-row AI call.
export function smartScore(t: TenderRow): number {
  let score = 0
  if (t.bid_submission_deadline) {
    const daysLeft = (new Date(t.bid_submission_deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    if (daysLeft < 0) score -= 50
    else if (daysLeft <= 2) score += 100
    else if (daysLeft <= 7) score += 70
    else if (daysLeft <= 30) score += 40
    else score += 10
  }
  if (t.category && t.category !== 'other') score += 15
  if (t.estimated_value_inr) score += 20
  if (t.nit_document_url) score += 5
  if (t.title && t.title.length > 40) score += 5
  return score
}
