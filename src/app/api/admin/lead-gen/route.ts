/**
 * Admin Lead Generation API — Netlify Free plan (10s hard cap)
 * 6 sources in parallel: Nominatim, DDG, Bing, Sulekha, Zomato (food), Practo (health)
 */

import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { scrapeLeads, CITIES, CATEGORIES } from '@/lib/scrapers/free-sources'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET() {
  return NextResponse.json({ cities: CITIES, categories: CATEGORIES })
}

export async function POST(request: Request) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const city = String(body.city ?? '').trim()
    const category = String(body.category ?? '').trim()
    const limit = Math.min(Math.max(parseInt(String(body.limit ?? '15')), 1), 25)

    if (!city || !category) {
      return NextResponse.json({ success: false, error: 'city and category are required' }, { status: 400 })
    }

    // 1. Multi-source parallel scrape (6 sources, ~6s total)
    const leads = await scrapeLeads(city, category, limit)

    if (leads.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No businesses found for "${category}" in "${city}". Try a broader category or different city.`,
      }, { status: 404 })
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
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
        sources: summarizeSources(leads),
        message: 'All found businesses already exist in the database.',
      })
    }

    // 3. Save to DB
    const { data, error } = await supabase
      .from('potential_leads')
      .insert(newLeads.map(l => ({
        business_name: l.business_name,
        address: l.address,
        phone: l.phone,
        website: l.website,
        city: l.city,
        category: l.category,
        ai_score: l.ai_score,
        status: 'pending',
        raw_data: l.raw_data,
      })))
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
      skipped: leads.length - newLeads.length,
      sources: summarizeSources(leads),
      message: `${data.length} new leads saved. ${leads.length - newLeads.length} duplicates skipped.`,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lead generation failed'
    console.error('[Lead Gen] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function summarizeSources(leads: Awaited<ReturnType<typeof scrapeLeads>>) {
  const counts: Record<string, number> = {}
  for (const l of leads) {
    const src = String(l.raw_data?.source ?? 'unknown')
    counts[src] = (counts[src] ?? 0) + 1
  }
  return counts
}
