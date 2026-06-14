import { NextRequest, NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { scrapeLeads, CITIES, CATEGORIES } from '@/lib/scrapers/free-sources'
import { callAI } from '@/lib/ai/router'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET() {
  return NextResponse.json({ cities: CITIES, categories: CATEGORIES })
}

export async function POST(request: NextRequest) {
  try {
    const context = await getBusinessApiContext()
    if (!context.portal.companyId) {
      return NextResponse.json({ success: false, error: 'Business context missing' }, { status: 400 })
    }

    const body = await request.json() as {
      mode?: 'manual' | 'ai'
      city?: string
      category?: string
      query?: string
      limit?: number
    }

    const mode = body.mode ?? 'manual'
    const limit = Math.min(Math.max(parseInt(String(body.limit ?? '10')), 1), 10)

    let city = String(body.city ?? '').trim()
    let category = String(body.category ?? '').trim()

    if (mode === 'ai') {
      const rawQuery = String(body.query ?? '').trim()
      if (!rawQuery) {
        return NextResponse.json({ success: false, error: 'query is required for AI mode' }, { status: 400 })
      }

      const cityList = CITIES.slice(0, 40).join(', ')
      const catList = CATEGORIES.slice(0, 40).join(', ')

      const extracted = await callAI(
        `You extract city and business category from a natural language search query.
Reply with ONLY valid JSON: {"city": "<city>", "category": "<category>"}
Cities available (use the closest match): ${cityList}
Categories available (use the closest match): ${catList}
If you cannot determine either, use empty string.`,
        `Search query: "${rawQuery}"`,
        80,
        'lead-search-extract'
      )

      const raw = extracted.replace(/```json?/g, '').replace(/```/g, '').trim()
      try {
        const parsed = JSON.parse(raw) as { city?: string; category?: string }
        city = String(parsed.city ?? '').trim()
        category = String(parsed.category ?? '').trim()
      } catch {
        console.error('[LeadSearch] AI parse failed:', raw)
        return NextResponse.json({
          success: false,
          error: 'AI extraction failed, try being more specific (e.g. "plumbers in Mumbai")',
        }, { status: 400 })
      }
    }

    if (!city || !category) {
      return NextResponse.json({ success: false, error: 'city and category are required' }, { status: 400 })
    }

    const leads = await scrapeLeads(city, category, limit)

    return NextResponse.json({
      success: true,
      city,
      category,
      leads: leads.map(l => ({
        business_name: l.business_name,
        address: l.address,
        phone: l.phone ?? null,
        email: l.email ?? null,
        website: l.website ?? null,
        city: l.city,
        category: l.category,
        ai_score: l.ai_score,
        source: l.raw_data?.source ?? 'scraped',
        raw_data: l.raw_data,
      })),
      total: leads.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed'
    const status = message === 'Unauthorized' || message === 'Active subscription required' ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
