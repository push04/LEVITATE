/**
 * POST /api/v1/leads/ingest
 * BizHarvest → Levitate Labs ingest endpoint.
 * Deduplication: phone number first, then name+city fallback.
 * Auth: x-api-key header must match BIZHARVEST_API_KEY env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { queueBusinessLeadWhatsApp } from '@/lib/whatsapp/queue-business-lead'

export const dynamic = 'force-dynamic'

interface BizHarvestRecord {
  uid?: string
  source?: string
  name?: string
  phone?: string
  phone_alt?: string
  address?: string
  city?: string
  pin_code?: string
  website?: string
  email?: string
  category?: string
  subcategory?: string
  rating?: number
  review_count?: number
  years_active?: string
  working_hours?: string
  maps_url?: string
  query_term?: string
  location_label?: string
  scraped_at?: string
}

function authOk(req: NextRequest): boolean {
  const key = process.env.BIZHARVEST_API_KEY
  if (!key) return false
  return req.headers.get('x-api-key') === key
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { records?: BizHarvestRecord[]; queue_whatsapp?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const records = body.records ?? []
  const doWhatsApp = body.queue_whatsapp !== false

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: 0, errors: 0 })
  }

  const supabase = getServiceSupabase()
  let inserted = 0
  let skipped  = 0
  let errors   = 0

  // ── Batch dedup check ──────────────────────────────────────────────────────
  // 1. Collect all non-null phones and name+city pairs from this batch
  const batchPhones   = records.map(r => r.phone).filter(Boolean) as string[]
  const batchNameCity = records
    .filter(r => !r.phone && r.name && r.city)
    .map(r => `${r.name?.toLowerCase().trim()}|${r.city?.toLowerCase().trim()}`)

  // 2. Single query: fetch existing leads matching any phone in this batch
  const existingPhones = new Set<string>()
  const existingNameCity = new Set<string>()

  if (batchPhones.length > 0) {
    const { data: phoneRows } = await supabase
      .from('leads')
      .select('phone')
      .in('phone', batchPhones)
    ;(phoneRows ?? []).forEach(r => { if (r.phone) existingPhones.add(r.phone) })
  }

  // 3. For records without phone: check name+city duplicates
  if (batchNameCity.length > 0) {
    const names  = records.filter(r => !r.phone && r.name).map(r => r.name as string)
    const cities = records.filter(r => !r.phone && r.city).map(r => r.city as string)
    const { data: nameRows } = await supabase
      .from('leads')
      .select('name, city')
      .in('name', names)
      .in('city', cities)
    ;(nameRows ?? []).forEach(r => {
      if (r.name && r.city)
        existingNameCity.add(`${r.name.toLowerCase().trim()}|${r.city.toLowerCase().trim()}`)
    })
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Build the row set to insert: filter out cross-batch dupes (checked
  // above against the DB) and within-batch dupes (scraper can emit the same
  // business twice), then insert everything in ONE bulk upsert call instead
  // of one round-trip per record — sequential per-row inserts here were
  // exceeding the serverless function's timeout window on larger batches.
  const seenPhones = new Set<string>()
  const seenNameCity = new Set<string>()
  const leadsToInsert: Record<string, unknown>[] = []

  for (const rec of records) {
    if (!rec.name || !rec.source) {
      errors++
      continue
    }

    // ── Deduplicate against existing DB rows: phone (primary) or name+city (fallback) ──
    if (rec.phone && existingPhones.has(rec.phone)) {
      skipped++
      continue
    }
    if (!rec.phone) {
      const key = `${rec.name.toLowerCase().trim()}|${(rec.city ?? rec.location_label ?? '').toLowerCase().trim()}`
      if (existingNameCity.has(key)) {
        skipped++
        continue
      }
    }

    // ── Deduplicate within this batch itself ───────────────────────────────
    if (rec.phone) {
      if (seenPhones.has(rec.phone)) { skipped++; continue }
      seenPhones.add(rec.phone)
    } else {
      const key = `${rec.name.toLowerCase().trim()}|${(rec.city ?? rec.location_label ?? '').toLowerCase().trim()}`
      if (seenNameCity.has(key)) { skipped++; continue }
      seenNameCity.add(key)
    }

    leadsToInsert.push(buildLeadRow(rec))
  }

  if (leadsToInsert.length > 0) {
    const { data, error } = await supabase
      .from('leads')
      .upsert(leadsToInsert, { onConflict: 'name,city,source', ignoreDuplicates: true })
      .select('id, phone, name')

    if (error) {
      console.error('[BizHarvest ingest] bulk upsert error:', error.code, error.message)
      errors += leadsToInsert.length
    } else {
      const insertedRows = data ?? []
      inserted = insertedRows.length
      // Rows that hit ON CONFLICT DO NOTHING aren't returned — count them as skipped.
      skipped += leadsToInsert.length - inserted

      if (doWhatsApp) {
        for (const row of insertedRows) {
          if (row.phone) {
            queueBusinessLeadWhatsApp({ name: row.name, phone: row.phone }).catch((e) =>
              console.error('[BizHarvest ingest] WhatsApp queue error:', e)
            )
          }
        }
      }
    }
  }

  // Log this run to agent_logs so the BizHarvest dashboard shows real numbers
  supabase.from('agent_logs').insert({
    agent_name: 'bizharvest',
    agent_version: '1.0',
    action: 'ingest',
    input: { total: records.length },
    output: { inserted, skipped, errors },
    status: errors > 0 && inserted === 0 ? 'failure' : inserted > 0 ? 'success' : 'partial',
    duration_ms: 0,
    credits_earned: 0,
    tokens_used: 0,
    ai_provider: 'none',
  }).then(() => {}, () => {})

  return NextResponse.json({ inserted, skipped, errors, total: records.length })
}

function buildLeadRow(rec: BizHarvestRecord): Record<string, unknown> {
  let workingHours: unknown = null
  if (rec.working_hours) {
    try { workingHours = JSON.parse(rec.working_hours) } catch { workingHours = rec.working_hours }
  }

  const uid = rec.uid ?? `${rec.source}_${rec.name}_${rec.city ?? ''}`.replace(/\s+/g, '_').toLowerCase()
  return {
    name:             rec.name,
    phone:            rec.phone ?? null,
    // leads.email is NOT NULL — use placeholder when scraper has no email
    email:            rec.email ?? `bh_${uid}@noemail.bh`,
    website_link:     rec.website ?? rec.maps_url ?? null,
    city:             rec.city ?? rec.location_label ?? null,
    service_category: rec.category ?? rec.subcategory ?? null,
    source:           `bizharvest_${rec.source}`,
    status:           'New',
    message:          buildMessage(rec),
    deal_value:       null,
    budget:           null,
    notes: JSON.stringify({
      rating:        rec.rating,
      review_count:  rec.review_count,
      years_active:  rec.years_active,
      working_hours: workingHours,
      maps_url:      rec.maps_url,
      query_term:    rec.query_term,
      scraped_at:    rec.scraped_at,
      uid:           rec.uid,
      phone_alt:     rec.phone_alt,
      pin_code:      rec.pin_code,
      address:       rec.address,
    }),
    created_at: rec.scraped_at ?? new Date().toISOString(),
  }
}

function buildMessage(rec: BizHarvestRecord): string {
  const parts: string[] = []
  if (rec.query_term)   parts.push(`Query: ${rec.query_term}`)
  if (rec.rating)       parts.push(`Rating: ${rec.rating}`)
  if (rec.review_count) parts.push(`Reviews: ${rec.review_count}`)
  if (rec.years_active) parts.push(`Est: ${rec.years_active}`)
  if (rec.maps_url)     parts.push(`Maps: ${rec.maps_url}`)
  return parts.join(' | ') || 'BizHarvest lead'
}
