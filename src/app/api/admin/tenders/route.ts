import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { getAllTenders, buildTenderAnalytics, smartScore } from '@/lib/tenderpulse-analytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceSupabase()
    const tenders = await getAllTenders(supabase)
    const analytics = buildTenderAnalytics(tenders)
    const withScore = tenders.map((t) => ({ ...t, smart_score: smartScore(t) }))
    return NextResponse.json({ tenders: withScore, analytics })
  } catch (err: any) {
    console.error('[tenderpulse] unhandled error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
