import { NextResponse } from 'next/server'
import { toResearchReportRecord } from '@/lib/business-intelligence-server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { isRecoverableResearchRateLimitMessage } from '@/lib/business-intelligence'
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getBusinessApiContext('reportHistory')
    const { id } = await params
    const supabase = getServiceSupabase()

    const [{ data: report, error: reportError }, { data: modules, error: modulesError }] = await Promise.all([
      supabase
        .from('business_research_reports')
        .select('id, status, target_name, target_type, target_url, notes, intelligence_score, report_summary, selected_modules, share_token, created_at, archived_at, business_profile')
        .eq('id', id)
        .eq('user_id', context.userId)
        .maybeSingle(),
      supabase
        .from('business_research_report_modules')
        .select('module_id, title, status, provider, generated_at, error, payload')
        .eq('report_id', id),
    ])

    if (reportError) {
      throw reportError
    }

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }

    if (modulesError) {
      throw modulesError
    }

    let hasRecoverableQueuedModules = false
    const moduleResults = (modules ?? []).reduce((acc, row) => {
      const moduleRow = row as ModuleRow
      const shouldQueueForRetry =
        moduleRow.status === 'failed' && isRecoverableResearchRateLimitMessage(moduleRow.error)

      if (shouldQueueForRetry) {
        hasRecoverableQueuedModules = true
      }

      acc[moduleRow.module_id] = {
        id: moduleRow.module_id,
        title: moduleRow.title,
        status: shouldQueueForRetry ? 'pending' : moduleRow.status,
        provider: moduleRow.provider ?? undefined,
        generatedAt: moduleRow.generated_at ?? undefined,
        error: shouldQueueForRetry ? undefined : moduleRow.error ?? undefined,
        payload: moduleRow.payload && typeof moduleRow.payload === 'object' ? moduleRow.payload : undefined,
      }
      return acc
    }, {} as Record<string, unknown>)

    const normalizedReport = toResearchReportRecord({
      ...(report as Parameters<typeof toResearchReportRecord>[0]),
      module_results: moduleResults,
    })

    if (hasRecoverableQueuedModules) {
      normalizedReport.status = 'generating'
    }

    return NextResponse.json({
      success: true,
      data: normalizedReport,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load report' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : error instanceof Error && (error.message === 'Active subscription required' || error.message.includes('feature is not enabled')) ? 403 : 500 }
    )
  }
}
