import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { getAllTenders } from '@/lib/tenderpulse-analytics'
import { tendersToCsv, tendersToXlsx, tendersToDocx, tendersToPdf } from '@/lib/tenderpulse-export'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ format: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { format } = await params
  const ids = request.nextUrl.searchParams.get('ids')

  try {
    const supabase = getServiceSupabase()
    let tenders = (await getAllTenders(supabase)).filter((t) => !t.is_hidden)
    if (ids) {
      const idSet = new Set(ids.split(','))
      tenders = tenders.filter((t) => idSet.has(t.id))
    }

    const filenameBase = `tenders-${new Date().toISOString().slice(0, 10)}`

    if (format === 'csv') {
      return new NextResponse(tendersToCsv(tenders), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
        },
      })
    }
    if (format === 'xlsx') {
      return new NextResponse(new Uint8Array(tendersToXlsx(tenders)), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
        },
      })
    }
    if (format === 'docx' || format === 'doc') {
      const buf = await tendersToDocx(tenders)
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filenameBase}.docx"`,
        },
      })
    }
    if (format === 'pdf') {
      return new NextResponse(new Uint8Array(tendersToPdf(tenders)), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
        },
      })
    }
    return NextResponse.json({ error: 'unsupported format, use csv/xlsx/docx/pdf' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
