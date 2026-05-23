import { NextResponse } from 'next/server'
import {
  buildReportDocx,
  buildReportPdf,
  getBusinessApiContext,
  toResearchReportRecord,
} from '@/lib/business-intelligence-server'
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getBusinessApiContext('reportHistory')
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') === 'pdf' ? 'pdf' : 'docx'
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
    if (modulesError) {
      throw modulesError
    }
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }

    const moduleResults = (modules ?? []).reduce((acc, row) => {
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
    }, {} as Record<string, unknown>)

    const assembledReport = toResearchReportRecord({
      ...(report as Parameters<typeof toResearchReportRecord>[0]),
      module_results: moduleResults,
    })

    const buffer = format === 'pdf'
      ? buildReportPdf(assembledReport)
      : await buildReportDocx(assembledReport)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="levitate-report-${id}.${format}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to export report' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
