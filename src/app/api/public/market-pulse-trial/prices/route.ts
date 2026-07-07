import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { findActiveInvite, marketPulseTrialStatus } from '@/lib/demo-invite'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 })

  const invite = await findActiveInvite(code)
  if (!invite || invite.tool !== 'market_pulse') {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }
  if (!marketPulseTrialStatus(invite).active) {
    return NextResponse.json({ error: 'Trial has expired' }, { status: 403 })
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
