import { NextResponse } from 'next/server'
import {
  buildPendingModuleResults,
  formatQuotaDayLabel,
  normalizeSelectedModules,
  type BusinessProfilePayload,
  type ResearchIntentPayload,
} from '@/lib/business-intelligence'
import {
  getBusinessApiContext,
  getResearchQuota,
  reserveResearchQuota,
} from '@/lib/business-intelligence-server'
import { buildSharedReportBacklinkUrl } from '@/lib/business-share'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizeProfile(value: unknown): BusinessProfilePayload {
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

function normalizeIntent(value: unknown): ResearchIntentPayload {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    intentType: typeof input.intentType === 'string' ? (input.intentType as ResearchIntentPayload['intentType']) : 'market',
    targetName: typeof input.targetName === 'string' ? input.targetName : '',
    targetUrl: typeof input.targetUrl === 'string' ? input.targetUrl : '',
    notes: typeof input.notes === 'string' ? input.notes : '',
  }
}

export async function GET() {
  try {
    const context = await getBusinessApiContext('reportHistory')
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('business_research_reports')
      .select('id, status, target_name, target_type, target_url, notes, intelligence_score, report_summary, selected_modules, share_token, created_at, archived_at, business_profile')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('business_research_reports')
      .update({ archived_at: new Date().toISOString(), status: 'archived' })
      .eq('user_id', context.userId)
      .is('archived_at', null)
      .lte('created_at', thirtyDaysAgo)

    return NextResponse.json({
      success: true,
      data: (data ?? []).map((report) => ({
        ...report,
        share_url: report.share_token
          ? buildSharedReportBacklinkUrl({
              companyName: context.portal.companyName,
              shareToken: report.share_token,
              workspaceUrl: context.portal.workspaceUrl,
            })
          : null,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load reports' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await getBusinessApiContext('marketResearch')
    const supabase = getServiceSupabase()
    const body = await request.json()
    const profile = normalizeProfile(body.profile)
    const intent = normalizeIntent(body.intent)
    const selectedModules = normalizeSelectedModules(body.selectedModules)
    const timeZone =
      (typeof body.timeZone === 'string' && body.timeZone) ||
      profile.preferredTimezone ||
      'Asia/Kolkata'

    if (!intent.targetName) {
      return NextResponse.json({ success: false, error: 'Research target is required' }, { status: 400 })
    }

    const pendingResults = buildPendingModuleResults(selectedModules)

    const { data: report, error } = await supabase
      .from('business_research_reports')
      .insert({
        user_id: context.userId,
        company_id: context.portal.companyId,
        status: 'generating',
        target_name: intent.targetName,
        target_type: intent.intentType,
        target_url: intent.targetUrl || null,
        notes: intent.notes || null,
        selected_modules: selectedModules,
        report_summary: null,
        intelligence_score: null,
        share_token: null,
        business_profile: profile,
      })
      .select('id, created_at')
      .single()

    if (error || !report) {
      throw error ?? new Error('Unable to create report')
    }

    try {
      await reserveResearchQuota(context.userId, report.id, timeZone)
    } catch {
      await supabase.from('business_research_reports').delete().eq('id', report.id)
      return NextResponse.json(
        {
          success: false,
          error: 'Daily report limit reached',
        },
        { status: 429 }
      )
    }

    const moduleRows = selectedModules.map(moduleId => ({
      report_id: report.id,
      module_id: moduleId,
      title: pendingResults[moduleId].title,
      status: 'pending',
    }))

    const { error: moduleInsertError } = await supabase
      .from('business_research_report_modules')
      .insert(moduleRows)

    if (moduleInsertError) {
      throw moduleInsertError
    }

    const quota = await getResearchQuota(context.userId, timeZone)

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        createdAt: report.created_at,
        targetName: intent.targetName,
        selectedModules,
      },
      quota: {
        ...quota,
        dayLabel: formatQuotaDayLabel(timeZone),
        timeZone,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to create report' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
