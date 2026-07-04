import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data: requests, error } = await supabase
    .from('marketplace_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const companyIds = [...new Set((requests ?? []).map(r => r.company_id))]
  const requestIds = (requests ?? []).map(r => r.id)

  const [{ data: companies }, { data: products }] = await Promise.all([
    companyIds.length ? supabase.from('companies').select('id, name').in('id', companyIds) : Promise.resolve({ data: [] }),
    requestIds.length ? supabase.from('marketplace_request_products').select('*').in('request_id', requestIds) : Promise.resolve({ data: [] }),
  ])

  const companyNameById = new Map((companies ?? []).map(c => [c.id, c.name]))
  const productsByRequest = new Map<string, unknown[]>()
  for (const p of products ?? []) {
    const list = productsByRequest.get(p.request_id) ?? []
    list.push(p)
    productsByRequest.set(p.request_id, list)
  }

  const enriched = (requests ?? []).map(r => ({
    ...r,
    companyName: companyNameById.get(r.company_id) ?? 'Unknown business',
    products: productsByRequest.get(r.id) ?? [],
  }))

  return NextResponse.json({ requests: enriched })
}
