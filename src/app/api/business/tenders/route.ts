import { NextRequest, NextResponse } from 'next/server'
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['civil_works', 'supply', 'services', 'it', 'mining', 'health', 'education', 'other'] as const

export async function GET(req: NextRequest) {
  try {
    await requireBusinessCompany('tenders')
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const { searchParams } = req.nextUrl
  const district = searchParams.get('district') ?? ''
  const category = searchParams.get('category') ?? ''
  const keyword = searchParams.get('keyword') ?? ''
  const minValue = parseInt(searchParams.get('min_value') ?? '0')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 30
  const offset = (page - 1) * limit

  const supabase = getServiceSupabase()
  // Customer-facing view: no notes/tags/is_hidden (admin-only curation fields).
  let q = supabase
    .from('tenders')
    .select(
      'id,title,organization,district,category,estimated_value_inr,emd_amount_inr,publish_date,bid_submission_deadline,nit_document_url,ai_summary,ai_eligibility_notes',
      { count: 'exact' }
    )
    .eq('is_hidden', false)
    .eq('status', 'active')
    .order('bid_submission_deadline', { ascending: true })
    .range(offset, offset + limit - 1)

  if (district) q = q.ilike('district', `%${district}%`)
  if (category) q = q.eq('category', category)
  if (minValue > 0) q = q.gte('estimated_value_inr', minValue)
  if (keyword) q = q.textSearch('search_vector', keyword, { type: 'websearch' })

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count ?? 0, categories: CATEGORIES })
}
