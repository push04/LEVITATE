import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, fetchAllRows } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { callAI, aiRouter } from '@/lib/ai/router'
import { parseNotes, bizharvestSourceLabel } from '@/lib/bizharvest-analytics'

export const dynamic = 'force-dynamic'

const STATUSES = ['New', 'Contacted', 'Follow Up', 'Closed'] as const
const SOURCES = ['gmaps', 'justdial', 'hotfrog'] as const
const SORTS = ['rating', 'recent', 'reviews'] as const

interface ParsedFilters {
  city: string | null
  category: string | null
  status: typeof STATUSES[number] | null
  hasPhone: boolean
  hasWebsite: 'yes' | 'no' | null
  minRating: number | null
  source: typeof SOURCES[number] | null
  sortBy: typeof SORTS[number] | null
}

const SYSTEM_PROMPT = `You are a query parser for BizHarvest, a database of local businesses scraped from Google Maps / JustDial / Hotfrog for Levitate Labs' lead-gen pipeline.
Extract search filters from the admin's request (which may reference an earlier turn in the conversation) and respond with ONLY a raw JSON object, no prose, no markdown fences, matching exactly this shape:
{
  "city": string or null,
  "category": string or null,
  "status": one of "New","Contacted","Follow Up","Closed" or null,
  "hasPhone": boolean,
  "hasWebsite": one of "yes","no" or null,
  "minRating": number or null,
  "source": one of "gmaps","justdial","hotfrog" or null,
  "sortBy": one of "rating","recent","reviews" or null
}
Rules:
- "category" should be a short generic keyword suitable for a partial text match against a business category (e.g. "restaurant" not "Italian fine-dining restaurants"), or null if not mentioned.
- "city" should be just the city/area name mentioned, or null.
- Set "hasPhone": true only if the admin explicitly wants contactable leads / phone numbers / callable leads.
- Set "hasWebsite": "no" when they ask for leads WITHOUT a website / that need a website / that don't have one yet (this is the most common and highest-value request — prospecting for web-design clients). Set "hasWebsite": "yes" only if they explicitly want leads that already have a website. Otherwise null.
- "minRating" only if a minimum star rating is mentioned (e.g. "4+ rated", "highly rated" implies 4).
- If the request builds on the previous turn (e.g. "now only ones with phone numbers"), carry over unmentioned filters from that previous turn's context.
- Never invent a city or category that wasn't mentioned in this or the prior turn.`

function sanitizeFilters(raw: unknown): ParsedFilters {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null)
  const status = STATUSES.includes(r.status as any) ? (r.status as ParsedFilters['status']) : null
  const source = SOURCES.includes(r.source as any) ? (r.source as ParsedFilters['source']) : null
  const sortBy = SORTS.includes(r.sortBy as any) ? (r.sortBy as ParsedFilters['sortBy']) : null
  const minRating = typeof r.minRating === 'number' && r.minRating > 0 && r.minRating <= 5 ? r.minRating : null
  const hasWebsite = r.hasWebsite === 'yes' || r.hasWebsite === 'no' ? r.hasWebsite : null
  return {
    city: str(r.city),
    category: str(r.category),
    status,
    hasPhone: r.hasPhone === true,
    hasWebsite,
    minRating,
    source,
    sortBy,
  }
}

function buildReply(f: ParsedFilters, total: number, withPhone: number, withWebsite: number, avgRating: number, shown: number) {
  if (total === 0) {
    const parts = [f.category, f.city ? `in ${f.city}` : null].filter(Boolean).join(' ')
    return `No BizHarvest leads found${parts ? ` for "${parts}"` : ''}${f.hasPhone ? ' with a phone number' : ''}. Try a broader city/category or run a scrape for that target first.`
  }
  const desc = [f.category, f.city ? `in ${f.city}` : null].filter(Boolean).join(' ') || 'leads'
  const phonePct = total ? Math.round((withPhone / total) * 100) : 0
  const websiteNote = f.hasWebsite === 'no' ? ' (none have a website)' : f.hasWebsite === 'yes' ? ' (all have a website)' : ''
  let reply = `Found ${total} lead${total === 1 ? '' : 's'} for "${desc}"${websiteNote}. `
  reply += `${withPhone} have phone numbers (${phonePct}%)`
  if (!f.hasWebsite && withWebsite) reply += `, ${withWebsite} have a website`
  reply += '.'
  if (avgRating > 0) reply += ` Average rating: ${avgRating}.`
  if (total > shown) reply += ` Showing the first ${shown} below — export for the full list.`
  return reply
}

const RETURN_CAP = 1000

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: string; history?: { role: 'user' | 'assistant'; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const history = (body.history ?? []).slice(-6)
  const historyText = history.map(h => `${h.role}: ${h.content}`).join('\n')
  const userPrompt = historyText ? `Conversation so far:\n${historyText}\n\nNew request: ${message}` : message

  let filters: ParsedFilters
  try {
    const raw = await callAI(SYSTEM_PROMPT, userPrompt, 250, 'bizharvest_chat')
    filters = sanitizeFilters(aiRouter.extractJSON(raw))
  } catch (err: any) {
    console.error('[bizharvest chat] filter parse failed:', err?.message ?? err)
    return NextResponse.json({
      error: 'Could not understand that request. Try something like "restaurants in Patna with phone numbers".',
    }, { status: 502 })
  }

  const supabase = getServiceSupabase()
  let base = supabase
    .from('leads')
    .select('id, name, source, city, service_category, phone, website_link, status, notes, deal_value, created_at')
    .like('source', 'bizharvest_%')

  if (filters.city) base = base.ilike('city', `%${filters.city}%`)
  if (filters.category) base = base.ilike('service_category', `%${filters.category}%`)
  if (filters.status) base = base.eq('status', filters.status)
  if (filters.source) base = base.eq('source', `bizharvest_${filters.source}`)
  if (filters.hasPhone) base = base.not('phone', 'is', null)
  if (filters.hasWebsite === 'yes') base = base.not('website_link', 'is', null)
  if (filters.hasWebsite === 'no') base = base.is('website_link', null)
  base = base.order('created_at', { ascending: false })

  let rows
  try {
    rows = await fetchAllRows((from, to) => base.range(from, to))
  } catch (err: any) {
    console.error('[bizharvest chat] query failed:', err?.message ?? err)
    return NextResponse.json({ error: `Query failed: ${err.message}` }, { status: 500 })
  }

  let leads = rows.map(l => {
    const meta = parseNotes(l.notes)
    return {
      id: l.id,
      name: l.name,
      city: l.city,
      category: l.service_category,
      phone: l.phone,
      website: l.website_link,
      status: l.status,
      rating: meta.rating ?? null,
      reviewCount: meta.review_count ?? null,
      dealValue: l.deal_value,
      source: bizharvestSourceLabel(l.source),
      createdAt: l.created_at,
    }
  })

  if (filters.minRating != null) leads = leads.filter(l => (l.rating ?? 0) >= filters.minRating!)

  if (filters.sortBy === 'rating') leads.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  else if (filters.sortBy === 'reviews') leads.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))

  const total = leads.length
  const withPhone = leads.filter(l => l.phone).length
  const withWebsite = leads.filter(l => l.website).length
  const rated = leads.filter(l => typeof l.rating === 'number' && l.rating! > 0)
  const avgRating = rated.length
    ? Math.round((rated.reduce((s, l) => s + (l.rating as number), 0) / rated.length) * 10) / 10
    : 0

  const resultLeads = leads.slice(0, RETURN_CAP)
  const reply = buildReply(filters, total, withPhone, withWebsite, avgRating, resultLeads.length)

  return NextResponse.json({
    reply,
    filters,
    leads: resultLeads,
    total,
    truncated: total > resultLeads.length,
  })
}
