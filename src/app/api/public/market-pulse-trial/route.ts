import { NextRequest, NextResponse } from 'next/server'
import { findActiveInvite, marketPulseTrialStatus } from '@/lib/demo-invite'
import { getMarketPulseDigestPayload } from '@/lib/market-pulse-digest-data'

export const dynamic = 'force-dynamic'

// Invite-only trial into the exact same Market Pulse data the paid business
// dashboard shows (via the shared getMarketPulseDigestPayload) - gated by a
// time-boxed invite code instead of a paid subscription. No public page
// involved; a code that isn't valid, isn't a market_pulse invite, or whose
// trial window has closed gets nothing back but the reason why.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 })

  const invite = await findActiveInvite(code)
  if (!invite) return NextResponse.json({ error: 'Your invite code is invalid or has expired.' }, { status: 404 })
  if (invite.tool !== 'market_pulse') {
    return NextResponse.json({ error: 'This invite does not cover the Market Pulse trial.' }, { status: 403 })
  }

  const trial = marketPulseTrialStatus(invite)
  if (!trial.active) {
    return NextResponse.json({
      trialExpired: true,
      businessName: invite.business_name,
      contactName: invite.contact_name,
    })
  }

  try {
    const payload = await getMarketPulseDigestPayload(request.nextUrl.searchParams.get('date'))
    return NextResponse.json({
      ...payload,
      trialExpired: false,
      businessName: invite.business_name,
      contactName: invite.contact_name,
      daysRemaining: trial.daysRemaining,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load Market Pulse' }, { status: 500 })
  }
}
