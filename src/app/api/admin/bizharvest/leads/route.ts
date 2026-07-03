import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Bulk delete BizHarvest-scraped leads by id. Scoped to source LIKE
// 'bizharvest_%' so this endpoint can never be used to delete manually
// entered or other-sourced CRM leads, even if a caller passes their ids.
export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { ids?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = (body.ids ?? []).filter(id => typeof id === 'string' && id.length > 0)
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }
  if (ids.length > 2000) {
    return NextResponse.json({ error: 'Max 2000 ids per request' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('leads')
    .delete()
    .in('id', ids)
    .like('source', 'bizharvest_%')
    .select('id')

  if (error) {
    console.error('[bizharvest leads] bulk delete error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: data?.length ?? 0 })
}
