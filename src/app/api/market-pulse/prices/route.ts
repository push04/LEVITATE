import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })

  const supabase = getServiceSupabase()

  // Only serve price history for tickers that have at least one published
  // digest entry — keeps the public endpoint from becoming a way to discover
  // which tickers are in the internal (unpublished) watchlist.
  const { data: everPublished } = await supabase
    .from('daily_digest')
    .select('ticker')
    .eq('ticker', ticker)
    .eq('published', true)
    .limit(1)
    .maybeSingle()

  if (!everPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('price_data')
    .select('date, open, high, low, close, volume')
    .eq('ticker', ticker)
    .order('date', { ascending: true })
    .limit(120)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ticker, bars: data ?? [] })
}
