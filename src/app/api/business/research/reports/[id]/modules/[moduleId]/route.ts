import { NextResponse } from 'next/server'
import {
  finalizeReport,
  generateResearchModule,
  getBusinessApiContext,
  getResearchQuota,
  updateUsageStatus,
} from '@/lib/business-intelligence-server'
import {
  normalizeSelectedModules,
  type BusinessProfilePayload,
  type ResearchModuleResult,
} from '@/lib/business-intelligence'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type ModuleRow = {
  module_id: string
  title: string
  status: string
  provider: string | null
  generated_at: string | null
  error: string | null
  payload: unknown
}

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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; moduleId: string }> }) {
  try {
    const context = await getBusinessApiContext('marketResearch')
    const { id, moduleId } = await params
    const normalizedModuleId = normalizeSelectedModules([moduleId])[0]
    const supabase = getServiceSupabase()

    if (!normalizedModuleId) {
      return NextResponse.json({ success: false, error: 'Unknown research module' }, { status: 404 })
    }

    const [{ data: report, error: reportError }, { data: moduleRow, error: moduleError }] = await Promise.all([
      supabase
        .from('business_research_reports')
        .select('id, user_id, status, target_name, target_type, target_url, notes, selected_modules, business_profile')
        .eq('id', id)
        .eq('user_id', context.userId)
        .maybeSingle(),
      supabase
        .from('business_research_report_modules')
        .select('*')
        .eq('report_id', id)
        .eq('module_id', moduleId)
        .maybeSingle(),
    ])

    if (reportError) {
      throw reportError
    }
    if (moduleError) {
      throw moduleError
    }

    if (!report || !moduleRow) {
      return NextResponse.json({ success: false, error: 'Report module not found' }, { status: 404 })
    }

    if (moduleRow.status === 'complete' && moduleRow.payload) {
      return NextResponse.json({
        success: true,
        data: {
          id: moduleRow.module_id,
          title: moduleRow.title,
          status: moduleRow.status,
          provider: moduleRow.provider,
          generatedAt: moduleRow.generated_at,
          payload: moduleRow.payload,
        },
      })
    }

    await supabase
      .from('business_research_reports')
      .update({
        status: 'generating',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    await supabase
      .from('business_research_report_modules')
      .update({ status: 'loading', error: null })
      .eq('report_id', id)
      .eq('module_id', normalizedModuleId)

    const profile = normalizeProfile(report.business_profile)
    const selectedModules = normalizeSelectedModules(report.selected_modules)
    let generation
    try {
      generation = await generateResearchModule(normalizedModuleId, {
        profile,
        intent: {
          intentType: report.target_type,
          targetName: report.target_name,
          targetUrl: report.target_url ?? '',
          notes: report.notes ?? '',
        },
        selectedModules,
        timeZone: profile.preferredTimezone,
      })
    } catch (generationError) {
      const errorMessage =
        generationError instanceof Error ? generationError.message : 'Live module generation failed'
      const retryAfterSeconds =
        generationError && typeof generationError === 'object' && 'retryAfterSeconds' in generationError
          ? Number((generationError as { retryAfterSeconds?: unknown }).retryAfterSeconds)
          : 0

      if (retryAfterSeconds > 0) {
        await supabase
          .from('business_research_report_modules')
          .update({
            status: 'pending',
            provider: null,
            generated_at: null,
            payload: null,
            error: null,
          })
          .eq('report_id', id)
          .eq('module_id', normalizedModuleId)

        await supabase
          .from('business_research_reports')
          .update({
            status: 'generating',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        return NextResponse.json(
          {
            success: true,
            queued: true,
            retryAfterSeconds,
            data: {
              id: normalizedModuleId,
              title: moduleRow.title,
              status: 'pending',
            },
            report: {
              reportStatus: 'generating',
            },
          },
          { status: 202 }
        )
      }

      await supabase
        .from('business_research_report_modules')
        .update({
          status: 'failed',
          provider: null,
          generated_at: new Date().toISOString(),
          payload: null,
          error: errorMessage,
        })
        .eq('report_id', id)
        .eq('module_id', normalizedModuleId)

      const { data: failedModules } = await supabase
        .from('business_research_report_modules')
        .select('module_id, title, status, provider, generated_at, error, payload')
        .eq('report_id', id)

      const failedResults = (failedModules ?? []).reduce((acc, row) => {
        const item = row as ModuleRow
        acc[item.module_id] = {
          id: item.module_id,
          title: item.title,
          status: item.status,
          provider: item.provider ?? undefined,
          generatedAt: item.generated_at ?? undefined,
          error: item.error ?? undefined,
          payload: item.payload && typeof item.payload === 'object' ? item.payload : undefined,
        }
        return acc
      }, {} as Record<string, ResearchModuleResult>)

      const failedFinalized = finalizeReport(failedResults, selectedModules)

      await supabase
        .from('business_research_reports')
        .update({
          status: failedFinalized.reportStatus,
          intelligence_score: failedFinalized.intelligenceScore,
          report_summary: failedFinalized.summary || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      await updateUsageStatus(id, 'failed')

      const quota = await getResearchQuota(context.userId, profile.preferredTimezone)

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          data: failedResults[normalizedModuleId],
          report: failedFinalized,
          quota,
        },
        { status: 500 }
      )
    }

    await supabase
      .from('business_research_report_modules')
      .update({
        status: 'complete',
        provider: generation.provider,
        generated_at: new Date().toISOString(),
        payload: generation.payload,
        error: null,
      })
      .eq('report_id', id)
      .eq('module_id', normalizedModuleId)

    const { data: allModules, error: allModulesError } = await supabase
      .from('business_research_report_modules')
      .select('module_id, title, status, provider, generated_at, error, payload')
      .eq('report_id', id)

    if (allModulesError) {
      throw allModulesError
    }

    const moduleResults = (allModules ?? []).reduce((acc, row) => {
      const item = row as ModuleRow
      acc[item.module_id] = {
        id: item.module_id,
        title: item.title,
        status: item.status,
        provider: item.provider ?? undefined,
        generatedAt: item.generated_at ?? undefined,
        error: item.error ?? undefined,
        payload: item.payload && typeof item.payload === 'object' ? item.payload : undefined,
      }
      return acc
    }, {} as Record<string, ResearchModuleResult>)

    const finalized = finalizeReport(moduleResults, selectedModules)

    await supabase
      .from('business_research_reports')
      .update({
        status: finalized.reportStatus,
        intelligence_score: finalized.intelligenceScore,
        report_summary: finalized.summary || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (finalized.reportStatus === 'complete') {
      await updateUsageStatus(id, 'completed')
    } else if (finalized.reportStatus === 'partial') {
      await updateUsageStatus(id, 'partial')
    }

    return NextResponse.json({
      success: true,
      data: {
        id: normalizedModuleId,
        title: moduleRow.title,
        status: 'complete',
        provider: generation.provider,
        generatedAt: new Date().toISOString(),
        payload: generation.payload,
      },
      report: finalized,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to generate module' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
