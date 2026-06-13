/**
 * Netlify Scheduled Function — Automated Lead Generation
 * Runs every 20 minutes (3×/hour), picks one city+category combo from a priority rotation,
 * scrapes 10 leads, deduplicates, saves to Supabase.
 *
 * Available on ALL Netlify plans including Legacy Free.
 * 10s timeout → scrapeLeads() takes ~6-7s → DB write ~0.5s → fits easily.
 *
 * Budget usage:
 *   72 runs/day × 30 days = 2,160 invocations/month = 1.7% of 125k legacy free limit ✓
 *
 * Rate limits (the real ceiling — not invocations):
 *   Each source gets 1 request per 20 min = 3 requests/hour per domain
 *   DDG: 3/hour is completely safe (anomaly triggers at sustained high-freq from same IP)
 *   All other sources: no meaningful rate limit at this frequency
 *
 * Combo rotation:
 *   30 cities × 30 categories = 900 unique combos → full cycle every ~8.75 days
 *   After full cycle, dedup removes already-seen businesses (runs stay fast)
 */

import { scrapeLeads } from '../../src/lib/scrapers/free-sources.js'
import { getServiceSupabase } from '../../src/lib/supabase.js'

// Every 20 minutes = 3 times per hour = 72/day = 2,160/month = 1.7% of 125k budget
export const config = { schedule: '*/20 * * * *' }

// ── Priority rotation ──────────────────────────────────────────────────────────
// 30 cities × 30 categories = 900 combos — full cycle every ~8.75 days at 20-min intervals
// Edit these lists to focus on your highest-value markets

const PRIORITY_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
  'Visakhapatnam', 'Vadodara', 'Coimbatore', 'Chandigarh', 'Kochi',
  'Noida', 'Gurugram', 'Patna', 'Agra', 'Nashik',
  'Navi Mumbai', 'Mysuru', 'Rajkot', 'Faridabad', 'Meerut',
]

const PRIORITY_CATEGORIES = [
  'restaurant', 'dental clinic', 'gym', 'salon', 'hospital',
  'pharmacy', 'coaching centre', 'real estate agent', 'plumber', 'electrician',
  'digital marketing agency', 'chartered accountant', 'hotel', 'event planner', 'interior designer',
  'driving school', 'pest control', 'travel agency', 'printing shop', 'grocery store',
  'physiotherapy', 'ca firm', 'web development', 'catering', 'packers and movers',
  'bakery', 'eye clinic', 'diagnostic centre', 'yoga studio', 'car repair',
]

// Flat list of all combos — index advances every 20-min window
const ALL_COMBOS = PRIORITY_CITIES.flatMap(city =>
  PRIORITY_CATEGORIES.map(category => ({ city, category }))
)

export default async (): Promise<Response> => {
  // Deterministic rotation: each 20-min window maps to a unique combo
  const windowIndex = Math.floor(Date.now() / (20 * 60 * 1000))
  const { city, category } = ALL_COMBOS[windowIndex % ALL_COMBOS.length]

  console.log(`[Cron] Starting: ${city} / ${category}`)

  try {
    // 1. Scrape — all 6 sources parallel, completes in ~6-7s
    const leads = await scrapeLeads(city, category, 10)

    if (leads.length === 0) {
      console.log(`[Cron] No leads found for ${city}/${category}`)
      return new Response('ok — no leads found')
    }

    // 2. Dedup against existing DB rows
    const supabase = getServiceSupabase()

    const { data: existing } = await supabase
      .from('potential_leads')
      .select('business_name')
      .eq('city', city)
      .eq('category', category)
      .in('business_name', leads.map(l => l.business_name))

    const existingNames = new Set((existing ?? []).map(e => e.business_name.toLowerCase()))
    const newLeads = leads.filter(l => !existingNames.has(l.business_name.toLowerCase()))

    if (newLeads.length === 0) {
      console.log(`[Cron] All ${leads.length} leads already exist for ${city}/${category}`)
      return new Response('ok — all duplicates')
    }

    // 3. Save new leads
    const { error } = await supabase.from('potential_leads').insert(
      newLeads.map(l => ({
        business_name: l.business_name,
        address: l.address,
        phone: l.phone,
        website: l.website,
        city: l.city,
        category: l.category,
        ai_score: l.ai_score,
        status: 'pending',
        raw_data: l.raw_data,
      }))
    )

    if (error) throw error

    console.log(`[Cron] Saved ${newLeads.length} new leads (${leads.length - newLeads.length} duplicates skipped) for ${city}/${category}`)
    return new Response(`ok — ${newLeads.length} saved`)

  } catch (err) {
    console.error(`[Cron] Error for ${city}/${category}:`, err)
    return new Response('error', { status: 500 })
  }
}
