import { NextResponse } from 'next/server'
import {
  generateLegalNoticeDraft,
  getBusinessApiContext,
  getPlainTextForLegalNotice,
} from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const context = await getBusinessApiContext('legalTools')
    const input = await request.json()
    const { draft, provider } = await generateLegalNoticeDraft(input)
    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('business_legal_notices')
      .insert({
        user_id: context.userId,
        company_id: context.portal.companyId,
        title: draft.title,
        notice_data: draft,
        plain_text: getPlainTextForLegalNotice(draft),
        ai_provider: provider,
      })
      .select('id, created_at')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        createdAt: data.created_at,
        provider,
        draft,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to draft notice' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
