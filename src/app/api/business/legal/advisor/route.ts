import { NextResponse } from 'next/server'
import { generateAdvisorRecommendation, getBusinessApiContext } from '@/lib/business-intelligence-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await getBusinessApiContext('legalTools')
    const input = await request.json()
    const cards = await generateAdvisorRecommendation(input)

    return NextResponse.json({
      success: true,
      data: cards,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to generate recommendation' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : error instanceof Error && (error.message === 'Active subscription required' || error.message.includes('feature is not enabled')) ? 403 : 500 }
    )
  }
}
