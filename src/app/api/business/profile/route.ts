import { NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import {
  type BusinessProfilePayload,
} from '@/lib/business-intelligence'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizeProfileBody(value: unknown): BusinessProfilePayload {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    businessName: typeof input.businessName === 'string' ? input.businessName : '',
    oneLineDescription: typeof input.oneLineDescription === 'string' ? input.oneLineDescription : '',
    industry: typeof input.industry === 'string' ? input.industry : '',
    subIndustry: typeof input.subIndustry === 'string' ? input.subIndustry : '',
    businessModelType: typeof input.businessModelType === 'string' ? (input.businessModelType as BusinessProfilePayload['businessModelType']) : 'other',
    primaryGeographies: Array.isArray(input.primaryGeographies) ? input.primaryGeographies.filter((item): item is string => typeof item === 'string') : [],
    companyStage: typeof input.companyStage === 'string' ? (input.companyStage as BusinessProfilePayload['companyStage']) : 'idea_stage',
    teamSizeRange: typeof input.teamSizeRange === 'string' ? (input.teamSizeRange as BusinessProfilePayload['teamSizeRange']) : 'solo',
    registrationStatus: typeof input.registrationStatus === 'string' ? (input.registrationStatus as BusinessProfilePayload['registrationStatus']) : 'other',
    isMsmeRegistered: Boolean(input.isMsmeRegistered),
    annualRevenueBracket: typeof input.annualRevenueBracket === 'string' ? input.annualRevenueBracket : '',
    primarySalesChannels: Array.isArray(input.primarySalesChannels) ? input.primarySalesChannels.filter((item): item is string => typeof item === 'string') : [],
    preferredTimezone: typeof input.preferredTimezone === 'string' && input.preferredTimezone ? input.preferredTimezone : 'Asia/Kolkata',
  }
}

export async function GET() {
  try {
    const context = await getBusinessApiContext('profileSettings')
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', context.userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data?.profile_data ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load business profile' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await getBusinessApiContext('profileSettings')
    const supabase = getServiceSupabase()
    const body = normalizeProfileBody(await request.json())

    const { error } = await supabase
      .from('business_profiles')
      .upsert({
        user_id: context.userId,
        company_id: context.portal.companyId,
        profile_data: body,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: body,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to save business profile' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
