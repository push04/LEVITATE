/**
 * BizDev Agent — Every 15 minutes
 *
 * Rotating cursor covers all 38 cities × 63 categories = 2,394 combos.
 * 2 combos per run × 96 runs/day = 192 combos/day → full cycle ~12 days.
 *
 * Sources (all free, no API keys):
 *  1. Nominatim (OSM Search) — PRIMARY: text search "restaurant Vadodara India", reliable
 *  2. Overpass API — SECONDARY: structured tag search (admin_level filter for India)
 *  3. Yellow Pages India — TERTIARY: HTML/JSON-LD scrape
 *  4. OpenCorporates — QUATERNARY: India registered company registry (500 req/day)
 *
 * All 4 sources run in PARALLEL per combo, both combos run in PARALLEL.
 * Total time ≈ max(source_times) ≈ 8s < Netlify 10s limit.
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { CITIES, CATEGORIES } from '../../src/lib/scrapers/free-sources'
import { getServiceSupabase } from '../../src/lib/supabase'
import { notifyFounder } from '../../src/lib/email/client'
import { queueBusinessLeadWhatsApp } from '../../src/lib/whatsapp/queue-business-lead'
import { requireInternalAuth } from './internal-auth'

// ─── Config ───────────────────────────────────────────────────────────────────

const COMBOS_PER_RUN = 2    // both run in parallel → total ≈ max(source_times) ≈ 6s
const DAILY_LEAD_MAX = 100
const TOTAL_COMBOS   = CITIES.length * CATEGORIES.length

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawLead {
  business_name: string
  phone?:        string
  email?:        string
  has_website:   boolean
  website?:      string
  city:          string
  category:      string
  lat?:          number
  lon?:          number
  source_tag?:   string   // which scraper found it
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

function comboAt(idx: number) {
  return {
    city:     CITIES[Math.floor(idx / CATEGORIES.length)],
    category: CATEGORIES[idx % CATEGORIES.length]
  }
}

async function getCursor(supabase: ReturnType<typeof getServiceSupabase>): Promise<number> {
  const { data } = await supabase
    .from('system_config').select('value').eq('key', 'bizdev_cursor').single()
  return (data?.value?.cursor as number) ?? 0
}

async function saveCursor(supabase: ReturnType<typeof getServiceSupabase>, cursor: number) {
  await supabase.from('system_config').upsert({
    key: 'bizdev_cursor',
    value: { cursor, total_combos: TOTAL_COMBOS, updated_at: new Date().toISOString() },
    description: 'BizDev rotation cursor'
  })
}

// ─── Source 1: Nominatim (OSM Search API) ────────────────────────────────────
// Much more reliable than raw Overpass for Indian cities.
// Returns businesses matching "{category} {city} India" with extratags (phone, website).

const SKIP_CLASSES = new Set(['highway','boundary','place','natural','waterway','landuse','railway','admin'])

async function scrapeNominatim(city: string, category: string): Promise<RawLead[]> {
  const q   = `${category} ${city} India`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=25&extratags=1&countrycodes=in&addressdetails=0`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'LevitateLabsBot/1.0 (levitatelabs.online; bizdev research)',
        'Accept':          'application/json',
        'Accept-Language': 'en'
      },
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return []

    const data = await res.json() as any[]
    const leads: RawLead[] = []

    for (const item of data ?? []) {
      if (SKIP_CLASSES.has(item.class ?? '')) continue
      const name = (item.name || (item.display_name ?? '').split(',')[0]).trim()
      if (!name || name.length < 3) continue

      const ext     = item.extratags ?? {}
      const phone   = (ext['phone'] || ext['contact:phone'] || ext['mobile'] || '').replace(/[\s\-()]/g, '')
      const website = ext['website'] || ext['contact:website'] || ext['url'] || ''
      const email   = ext['email']   || ext['contact:email']   || ''

      leads.push({
        business_name: name,
        phone:       phone   || undefined,
        email:       email   || undefined,
        has_website: !!website,
        website:     website || undefined,
        city, category,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        source_tag: 'Nominatim'
      })
    }
    return leads
  } catch { return [] }
}

// ─── Source 2: Overpass API (admin_level filter — works for Indian cities) ────

const OSM_TAGS: Record<string, string[]> = {
  restaurant:     ['amenity=restaurant', 'amenity=fast_food'],
  cafe:           ['amenity=cafe'],
  bakery:         ['shop=bakery'],
  'cake shop':    ['shop=confectionery'],
  clinic:         ['amenity=clinic', 'amenity=doctors'],
  hospital:       ['amenity=hospital'],
  'dental clinic':['amenity=dentist'],
  pharmacy:       ['amenity=pharmacy'],
  school:         ['amenity=school'],
  college:        ['amenity=college', 'amenity=university'],
  gym:            ['leisure=fitness_centre'],
  salon:          ['shop=hairdresser', 'shop=beauty'],
  spa:            ['leisure=spa'],
  boutique:       ['shop=clothes'],
  jeweler:        ['shop=jewelry', 'shop=jewellery'],
  hotel:          ['tourism=hotel'],
  electronics:    ['shop=electronics'],
  'mobile shop':  ['shop=mobile_phone'],
  furniture:      ['shop=furniture'],
  supermarket:    ['shop=supermarket'],
  lawyer:         ['office=lawyer'],
  accountant:     ['office=accountant'],
}

async function scrapeOverpass(city: string, category: string): Promise<RawLead[]> {
  const catLower = category.toLowerCase()

  let tags: string[] = []
  for (const [key, vals] of Object.entries(OSM_TAGS)) {
    if (catLower.includes(key) || key.includes(catLower.split(' ')[0])) {
      tags = vals; break
    }
  }
  if (tags.length === 0) return [] // skip if no OSM tag mapping

  const tagLines = tags.map(t => {
    const [k, v] = t.split('=')
    return `node["${k}"="${v}"](area.searcharea);way["${k}"="${v}"](area.searcharea);`
  }).join('\n')

  // Use admin_level filter — Indian cities are admin_level 4–8
  const query = `
    [out:json][timeout:8];
    area["name"="${city}"]["admin_level"~"^[4-8]$"]->.searcharea;
    (${tagLines});
    out body 25;
  `

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(9000)
    })
    if (!res.ok) return []

    const json = await res.json() as { elements?: any[] }
    const leads: RawLead[] = []

    for (const el of json.elements ?? []) {
      const t    = el.tags ?? {}
      const name = t['name'] || t['name:en']
      if (!name || name.length < 2) continue

      const phone   = (t['phone'] || t['contact:phone'] || t['mobile'] || '').replace(/[\s\-()]/g, '')
      const website = t['website'] || t['contact:website'] || t['url'] || ''
      const email   = t['email']   || t['contact:email']   || ''

      leads.push({
        business_name: name,
        phone:       phone   || undefined,
        email:       email   || undefined,
        has_website: !!website,
        website:     website || undefined,
        city, category,
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
        source_tag: 'OSM'
      })
    }
    return leads
  } catch { return [] }
}

// ─── Source 2: Yellow Pages India (JSON-LD structured data) ───────────────────
// Many directories embed JSON-LD for SEO — machine readable, no JS needed.

async function scrapeYellowPages(city: string, category: string): Promise<RawLead[]> {
  const catSlug  = category.toLowerCase().replace(/[\s/]+/g, '-')
  const citySlug = city.toLowerCase().replace(/\s+/g, '-')
  const urls = [
    `https://www.yellowpages.in/search?what=${encodeURIComponent(category)}&where=${encodeURIComponent(city)}`,
    `https://www.yellowpages.in/${citySlug}/${catSlug}`
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9'
        },
        signal: AbortSignal.timeout(6000)
      })

      if (!res.ok) continue
      const html = await res.text()

      const leads: RawLead[] = []

      // ── Strategy 1: JSON-LD structured data (most reliable) ──
      const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? []
      for (const block of jsonLdBlocks) {
        try {
          const content = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
          const data = JSON.parse(content)
          const items = Array.isArray(data) ? data : (data['@graph'] ?? [data])
          for (const item of items) {
            if (!item.name) continue
            const types = ['LocalBusiness','FoodEstablishment','MedicalBusiness','HealthAndBeautyBusiness',
                           'Store','Hotel','LegalService','FinancialService','ProfessionalService']
            if (!types.some(t => (item['@type'] ?? '').toString().includes(t.replace('Business','')))) continue
            const phone = item.telephone ?? item.phone ?? ''
            const website = item.url ?? item.sameAs ?? ''
            const emailVal = item.email ?? ''
            leads.push({
              business_name: item.name.trim(),
              phone:   phone   ? phone.replace(/\s/g, '')   : undefined,
              email:   emailVal ? emailVal.trim()           : undefined,
              has_website: !!website,
              website: website || undefined,
              city, category,
              source_tag: 'YellowPages'
            })
            if (leads.length >= 20) break
          }
        } catch { /* bad JSON-LD, skip */ }
        if (leads.length >= 20) break
      }
      if (leads.length > 0) return leads

      // ── Strategy 2: regex fallback on raw HTML ──
      // Phone numbers: Indian mobile/landline
      const phoneMatches = [...html.matchAll(/(?<![0-9])([6-9]\d{9})(?![0-9])/g)].map(m => m[1])
      // Email addresses
      const emailMatches = [...html.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)]
        .map(m => m[1])
        .filter(e => !e.includes('example') && !e.includes('noreply'))
      // Business names from title tags or h2/h3
      const nameMatches = [...html.matchAll(/<(?:h2|h3|strong)[^>]*class="[^"]*(?:name|title|business)[^"]*"[^>]*>([^<]{3,60})<\//gi)]
        .map(m => m[1].trim())

      for (let i = 0; i < Math.min(nameMatches.length, 15); i++) {
        leads.push({
          business_name: nameMatches[i],
          phone:      phoneMatches[i] ?? undefined,
          email:      emailMatches[i] ?? undefined,
          has_website: false,
          city, category,
          source_tag: 'YellowPages'
        })
      }
      if (leads.length > 0) return leads

    } catch { /* try next URL */ }
  }
  return []
}

// ─── Source 3: OpenCorporates — India registered companies ───────────────────
// Free public API, no key required, 500 req/day. Returns real registered companies.

async function scrapeOpenCorporates(city: string, category: string): Promise<RawLead[]> {
  const query = `${category} ${city}`
  const url   = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(query)}&jurisdiction_code=in&per_page=20`

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return []

    const json = await res.json() as { results?: { companies?: any[] } }
    const leads: RawLead[] = []

    for (const item of json.results?.companies ?? []) {
      const co = item.company
      if (!co?.name || co.name.length < 3) continue
      // Skip generic holding companies
      if (/HOLD|INVEST|CAPITAL|FINANCE|PRIVATE LIMITED$/i.test(co.name) && !category.toLowerCase().includes('finance')) {
        // allow if category is finance-adjacent
        if (!['accountant','lawyer','finance'].some(f => category.toLowerCase().includes(f))) continue
      }
      leads.push({
        business_name: co.name,
        has_website:   false,
        city, category,
        source_tag: 'OpenCorporates'
      })
    }
    return leads
  } catch { return [] }
}

// ─── Merge & deduplicate across sources ──────────────────────────────────────

function mergeLeads(all: RawLead[]): RawLead[] {
  const seen = new Map<string, RawLead>()
  for (const lead of all) {
    const key = lead.business_name.toLowerCase().trim().replace(/[^a-z0-9]/g, '').slice(0, 30)
    if (seen.has(key)) {
      // Merge: prefer the version with more data
      const existing = seen.get(key)!
      seen.set(key, {
        ...existing,
        phone:      existing.phone   ?? lead.phone,
        email:      existing.email   ?? lead.email,
        website:    existing.website ?? lead.website,
        has_website: existing.has_website || lead.has_website,
        lat:        existing.lat ?? lead.lat,
        lon:        existing.lon ?? lead.lon,
      })
    } else {
      seen.set(key, lead)
    }
  }
  return Array.from(seen.values())
}

// ─── Scrape all sources for one combo ────────────────────────────────────────

async function scrapeCombo(city: string, category: string): Promise<RawLead[]> {
  const results = await Promise.allSettled([
    scrapeNominatim(city, category),      // primary — reliable text search on OSM
    scrapeOverpass(city, category),       // secondary — structured tags, may find extra
    scrapeYellowPages(city, category),    // tertiary — HTML scrape
    scrapeOpenCorporates(city, category), // quaternary — registered companies
  ])

  const all: RawLead[] = []
  const sourceCounts: string[] = []

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      all.push(...r.value)
      sourceCounts.push(`${r.value[0]?.source_tag ?? '?'}:${r.value.length}`)
    }
  }

  console.log(`[BizDev] ${city}/${category} → ${sourceCounts.join(', ') || 'no results'}`)
  return mergeLeads(all)
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

async function scoreLead(lead: RawLead): Promise<number> {
  let score = 0
  if (!lead.has_website) score += 4
  if (lead.phone)        score += 1
  if (lead.email)        score += 2   // email = can be contacted immediately

  const highValue = ['restaurant','clinic','school','salon','gym','boutique','jewel',
    'photo','hotel','coach','dental','doctor','catering','event','wedding']
  if (highValue.some(h => lead.category.toLowerCase().includes(h))) score += 2

  if (score >= 4) {  // lowered threshold — nearly any real business qualifies
    try {
      const aiScore = await callAI(
        'Score this Indian business lead 1-10 for needing a website. 10=desperately needs one. Reply with a single integer only.',
        JSON.stringify({ name: lead.business_name, type: lead.category, city: lead.city, has_website: lead.has_website }),
        20, 'bizdev'
      )
      const n = parseInt(aiScore.trim())
      if (!isNaN(n)) score = Math.round((score + n) / 2)
    } catch { /* keep rule-based score */ }
  }

  return Math.min(10, Math.max(1, score))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async () => {
  const supabase = getServiceSupabase()

  try {
    // Daily limit check
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { count: todayCount } = await supabase
      .from('leads').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()).eq('source', 'bizdev_agent')

    const { data: cfgData } = await supabase
      .from('system_config').select('value').eq('key', 'outreach_limits').single()
    const dailyMax: number = cfgData?.value?.daily_max ?? DAILY_LEAD_MAX

    if ((todayCount ?? 0) >= dailyMax) {
      console.log(`[BizDev] Daily limit reached (${todayCount}/${dailyMax})`)
      return
    }

    // Read cursor
    const cursor = await getCursor(supabase)
    const combos = Array.from({ length: COMBOS_PER_RUN }, (_, i) =>
      comboAt((cursor + i) % TOTAL_COMBOS)
    )
    const nextCursor = (cursor + COMBOS_PER_RUN) % TOTAL_COMBOS
    const isNewCycle = cursor + COMBOS_PER_RUN > TOTAL_COMBOS

    console.log(`[BizDev] Cursor ${cursor}/${TOTAL_COMBOS} | ${combos.map(c=>`${c.city}/${c.category}`).join(' · ')}`)
    if (isNewCycle) console.log('[BizDev] New rotation cycle started')

    // Scrape all combos in PARALLEL (both run at the same time → stays under 10s)
    const results = await Promise.all(
      combos.map(({ city, category }) => scrapeCombo(city, category))
    )
    const rawLeads = results.flat()

    console.log(`[BizDev] Total merged leads: ${rawLeads.length}`)

    // Score and save
    let saved = 0
    const sourceBreakdown: Record<string, number> = {}

    for (const lead of rawLeads) {
      if ((todayCount ?? 0) + saved >= dailyMax) break

      const score = await scoreLead(lead)
      if (score < 3) continue  // save almost everything — low score = maybe has website, still worth checking

      // Dedup check
      const { data: existing } = await supabase
        .from('leads').select('id').ilike('name', lead.business_name).limit(1)
      if (existing?.length) continue

      const mapsUrl = lead.lat && lead.lon
        ? `https://www.openstreetmap.org/?mlat=${lead.lat}&mlon=${lead.lon}#map=17/${lead.lat}/${lead.lon}`
        : null

      const { error } = await supabase.from('leads').insert({
        name:             lead.business_name,
        phone:            lead.phone      ?? null,
        whatsapp:         lead.phone      ?? null,
        email:            lead.email      ?? null,
        city:             lead.city,
        service_category: lead.category,
        google_map_link:  mapsUrl,
        website_link:     lead.has_website ? (lead.website ?? null) : null,
        has_website:      lead.has_website,
        deal_value:       score * 5000,
        ai_score:         score,
        source:           'bizdev_agent',
        source_data:      { source: lead.source_tag ?? 'mixed', lat: lead.lat, lon: lead.lon },
        status:           'New',
        notes:            `Score: ${score}/10 | ${lead.source_tag ?? 'mixed'} | ${lead.city}/${lead.category}${lead.has_website ? ' | HAS WEBSITE' : ' | NO WEBSITE'}${lead.email ? ' | HAS EMAIL' : ''}`
      })

      if (error) {
        console.error(`[BizDev] Insert failed for ${lead.business_name}:`, error.message)
        continue
      }

      await queueBusinessLeadWhatsApp({
        name: lead.business_name,
        phone: lead.phone ?? null,
        whatsapp: lead.phone ?? null
      })

      sourceBreakdown[lead.source_tag ?? 'unknown'] = (sourceBreakdown[lead.source_tag ?? 'unknown'] ?? 0) + 1

      await supabase.rpc('update_agent_credits', {
        p_agent_name: 'bizdev',
        p_amount:     5,
        p_reason:     `Found ${lead.business_name}`
      })
      saved++
    }

    // Save cursor
    await saveCursor(supabase, nextCursor)

    // Send realtime notification if leads were found
    if (saved > 0) {
      const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
      const subject = `[LEADS FOUND] ${saved} new leads — Levitate Labs ${timeStr}`
      const body = `BizDev Agent found ${saved} new leads:\n\n${Object.entries(sourceBreakdown).map(([src, count]) => `• ${src}: ${count} leads`).join('\n')}\n\nCategories scanned: ${combos.map(c => `${c.city}/${c.category}`).join(', ')}\n\nView leads in dashboard: https://levitatelabs.online/admin/dashboard/leads\n\n— Levitate Labs Automation`
      const emailSent = await notifyFounder(subject, body)
      console.log(`[BizDev] Lead notification email sent: ${emailSent}`)
    }

    await supabase.from('agent_logs').insert({
      agent_name:     'bizdev',
      action:         'rotation_scan',
      input: {
        cursor_start:  cursor,
        cursor_end:    nextCursor,
        combos:        combos.map(c => `${c.city}/${c.category}`),
        rotation_pct:  Math.round(nextCursor / TOTAL_COMBOS * 100),
        new_cycle:     isNewCycle
      },
      output: {
        found:   rawLeads.length,
        saved,
        sources: sourceBreakdown,
        source:  'OSM+YellowPages+OpenCorporates'
      },
      status:         'success',
      credits_earned: saved * 5
    })

    console.log(`[BizDev] Saved ${saved} leads | Sources: ${JSON.stringify(sourceBreakdown)} | Cursor → ${nextCursor}/${TOTAL_COMBOS}`)

  } catch (err) {
    console.error('[BizDev] Error:', err)
    await supabase.from('agent_logs').insert({
      agent_name:     'bizdev',
      action:         'rotation_scan',
      input:          {},
      output:         { error: String(err) },
      status:         'failure',
      credits_earned: -10
    }).catch(() => {})
  }
}

export const config: Config = {
  schedule: '*/15 * * * *'
}
