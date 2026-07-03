import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase, fetchAllRows } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyFilter = req.nextUrl.searchParams.get('filter')
  const supabase = getServiceSupabase()

  try {
    const messages = await fetchAllRows((from, to) => {
      let q = supabase
        .from('whatsapp_queue')
        .select('id, to_number, contact_name, message, status, error, company_id, created_at')
        .order('created_at', { ascending: false })
        .range(from, to)
      if (companyFilter === 'admin') q = q.is('company_id', null)
      return q
    })

    const summary = {
      total: messages.length,
      sent: messages.filter(m => m.status === 'sent').length,
      pending: messages.filter(m => m.status === 'pending').length,
      failed: messages.filter(m => m.status === 'failed').length,
    }

    return NextResponse.json({ summary, messages })
  } catch (err: any) {
    console.error('[whatsapp/queue/export] error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
