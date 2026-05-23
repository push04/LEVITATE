import { NextResponse } from 'next/server'
import {
  buildLegalNoticeDocx,
  buildLegalNoticePdf,
  getBusinessApiContext,
} from '@/lib/business-intelligence-server'
import type { LegalNoticeDraft } from '@/lib/business-intelligence'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await getBusinessApiContext('legalTools')
    const body = await request.json()
    const format = body.format === 'pdf' ? 'pdf' : 'docx'
    const draft = body.draft as LegalNoticeDraft

    if (!draft?.sections?.header) {
      return NextResponse.json({ success: false, error: 'Notice draft is required' }, { status: 400 })
    }

    const buffer = format === 'pdf'
      ? buildLegalNoticePdf(draft)
      : await buildLegalNoticeDocx(draft)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="levitate-legal-notice.${format}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to export notice' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
