import { NextRequest, NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await getBusinessApiContext()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const city = searchParams.get('city') ?? ''
  const category = searchParams.get('category') ?? ''
  const minScore = parseInt(searchParams.get('min_score') ?? '0')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 50
  const offset = (page - 1) * limit

  const supabase = getServiceSupabase()
  let q = supabase
    .from('potential_leads')
    .select('business_name,city,category,phone,website,address,ai_score,created_at', { count: 'exact' })
    .order('ai_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (city) q = q.ilike('city', `%${city}%`)
  if (category) q = q.ilike('category', `%${category}%`)
  if (minScore > 0) q = q.gte('ai_score', minScore)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count })
}
