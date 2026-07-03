import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { getAllTenders } from '@/lib/tenderpulse-analytics'
import { matchTendersForClient } from '@/lib/tenderpulse-matcher'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const supabase = getServiceSupabase()
    const { data: client, error: clientErr } = await supabase.from('tender_clients').select('*').eq('id', id).single()
    if (clientErr || !client) return NextResponse.json({ error: 'client not found' }, { status: 404 })

    const tenders = await getAllTenders(supabase)
    const matches = matchTendersForClient(tenders, client)
    return NextResponse.json({ count: matches.length, tenders: matches })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
