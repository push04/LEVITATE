import { NextRequest, NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'
import { CITIES, CATEGORIES } from '@/lib/scrapers/free-sources'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const context = await getBusinessApiContext()
    const supabase = getServiceSupabase()

    const { data } = await supabase
      .from('api_key_lead_preferences')
      .select('cities, categories, updated_at')
      .eq('user_id', context.userId)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        preferences: data ?? { cities: [], categories: [] },
        available: { cities: CITIES, categories: CATEGORIES },
      },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getBusinessApiContext()

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const citySet = new Set(CITIES)
    const catSet = new Set(CATEGORIES)

    const cities: string[] = Array.isArray(body.cities)
      ? body.cities.filter((c: unknown) => typeof c === 'string' && citySet.has(c))
      : []
    const categories: string[] = Array.isArray(body.categories)
      ? body.categories.filter((c: unknown) => typeof c === 'string' && catSet.has(c))
      : []

    const supabase = getServiceSupabase()
    const { error } = await supabase
      .from('api_key_lead_preferences')
      .upsert(
        { user_id: context.userId, cities, categories, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: { cities, categories } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    )
  }
}
