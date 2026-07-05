import { NextRequest, NextResponse } from 'next/server'
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireBusinessCompany('marketPulse')
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const ticker = req.nextUrl.searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('price_data')
    .select('date, open, high, low, close, volume')
    .eq('ticker', ticker)
    .order('date', { ascending: true })
    .limit(120)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ticker, bars: data ?? [] })
}
