import { NextResponse } from 'next/server'
import { formatQuotaDayLabel } from '@/lib/business-intelligence'
import { getBusinessApiContext, getResearchQuota } from '@/lib/business-intelligence-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await getBusinessApiContext('marketResearch')
    const { searchParams } = new URL(request.url)
    const timeZone =
      searchParams.get('timezone') ||
      'Asia/Kolkata'

    const quota = await getResearchQuota(context.userId, timeZone)

    return NextResponse.json({
      success: true,
      ...quota,
      timeZone,
      dayLabel: formatQuotaDayLabel(timeZone),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load quota' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
