import { NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import {
  buildSharedLegalNoticeBacklinkUrl,
  createLegalNoticeShareToken,
} from '@/lib/business-share'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getBusinessApiContext('legalTools')
    const { id } = await params
    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('business_legal_notices')
      .select('id')
      .eq('id', id)
      .eq('user_id', context.userId)
      .maybeSingle()

    if (error || !data) {
      throw error ?? new Error('Legal notice not found')
    }

    const shareToken = createLegalNoticeShareToken(data.id)
    const url = buildSharedLegalNoticeBacklinkUrl({
      companyName: context.portal.companyName,
      shareToken,
      workspaceUrl: context.portal.workspaceUrl,
    })

    return NextResponse.json({
      success: true,
      data: {
        shareToken,
        url,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to share legal notice' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
