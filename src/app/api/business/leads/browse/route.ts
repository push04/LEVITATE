import { NextRequest, NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let planId: string | null
  try {
    const { portal } = await getBusinessApiContext('leads')
    planId = portal.planId
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Rows visible via Browse DB — read directly from the plan's own row so
  // renaming a plan in the admin panel can never silently remove the cap
  // (a name-keyed lookup table would fail open on rename).
  let rowCap = Infinity
  if (planId) {
    const { data: planRow } = await supabase
      .from('onboarding_plans')
      .select('feature_controls')
      .eq('id', planId)
      .maybeSingle()
    const cap = (planRow?.feature_controls as { browseRowCap?: number | null } | null)?.browseRowCap
    if (typeof cap === 'number' && cap > 0) rowCap = cap
  }

  const { searchParams } = req.nextUrl
  const city = searchParams.get('city') ?? ''
  const category = searchParams.get('category') ?? ''
  const minScore = parseInt(searchParams.get('min_score') ?? '0')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 50
  const offset = (page - 1) * limit

  if (offset >= rowCap) {
    return NextResponse.json({ data: [], total: 0, capped: true, capLimit: rowCap })
  }

  let q = supabase
    .from('potential_leads')
    .select('business_name,city,category,phone,website,address,ai_score,created_at', { count: 'exact' })
    .order('ai_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, Math.min(offset + limit, rowCap) - 1)

  if (city) q = q.ilike('city', `%${city}%`)
  if (category) q = q.ilike('category', `%${category}%`)
  if (minScore > 0) q = q.gte('ai_score', minScore)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = count ?? 0
  return NextResponse.json({
    data,
    total: Math.min(total, rowCap),
    capped: rowCap !== Infinity && total > rowCap,
    capLimit: rowCap === Infinity ? null : rowCap,
  })
}
