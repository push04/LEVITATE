import { NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { buildSharedReportBacklinkUrl } from '@/lib/business-share'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getBusinessApiContext('reportHistory')
    const { id } = await params
    const supabase = getServiceSupabase()
    const shareToken = crypto.randomUUID()

    const { data, error } = await supabase
      .from('business_research_reports')
      .update({ share_token: shareToken, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', context.userId)
      .select('share_token')
      .single()

    if (error || !data) {
      throw error ?? new Error('Unable to create share link')
    }

    const url = buildSharedReportBacklinkUrl({
      companyName: context.portal.companyName,
      shareToken: data.share_token,
      workspaceUrl: context.portal.workspaceUrl,
    })

    return NextResponse.json({
      success: true,
      data: {
        shareToken: data.share_token,
        url,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to share report' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
