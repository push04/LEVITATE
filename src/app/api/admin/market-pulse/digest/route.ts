import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: latestDateRow } = await supabase
    .from('daily_digest')
    .select('digest_date')
    .order('digest_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestDateRow) {
    return NextResponse.json({ digestDate: null, digest: [] })
  }

  const digestDate = latestDateRow.digest_date as string

  const { data, error } = await supabase
    .from('daily_digest')
    .select('ticker, company_name, sector, sentiment_trend, avg_confidence, news_count, price_change_pct, rsi_14, trend_signal, divergence_flag, summary_text, published')
    .eq('digest_date', digestDate)
    .order('divergence_flag', { ascending: false })
    .order('avg_confidence', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ digestDate, digest: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const digestDate = body.digestDate as string | undefined
  const tickers = body.tickers as string[] | undefined
  const published = body.published as boolean | undefined

  if (!digestDate || !Array.isArray(tickers) || tickers.length === 0 || typeof published !== 'boolean') {
    return NextResponse.json({ error: 'digestDate, tickers[], and published are required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('daily_digest')
    .update({ published })
    .eq('digest_date', digestDate)
    .in('ticker', tickers)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
