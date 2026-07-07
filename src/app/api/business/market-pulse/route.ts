import { NextRequest, NextResponse } from 'next/server'
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server'
import { getMarketPulseDigestPayload } from '@/lib/market-pulse-digest-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireBusinessCompany('marketPulse')
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  try {
    const payload = await getMarketPulseDigestPayload(request.nextUrl.searchParams.get('date'))
    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load Market Pulse' }, { status: 500 })
  }
}
