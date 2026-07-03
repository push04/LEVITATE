import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { getAllTenders } from '@/lib/tenderpulse-analytics'
import { buildDigestHtml } from '@/lib/tenderpulse-matcher'
import { sendTenderEmail } from '@/lib/tenderpulse-mailer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, tenderIds, subject } = await request.json().catch(() => ({}))
  if (!to || !Array.isArray(tenderIds) || !tenderIds.length) {
    return NextResponse.json({ error: 'to and tenderIds[] are required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  try {
    const idSet = new Set(tenderIds as string[])
    const tenders = (await getAllTenders(supabase)).filter((t) => idSet.has(t.id))

    const { data: delivery, error: insertErr } = await supabase
      .from('deliveries')
      .insert({ tender_ids: tenders.map((t) => t.id), channel: 'email', recipient_email: to, status: 'pending' })
      .select()
      .single()
    if (insertErr) throw insertErr

    const result = await sendTenderEmail(to, subject || `${tenders.length} tenders — TenderPulse BJ`, buildDigestHtml('', tenders))

    await supabase
      .from('deliveries')
      .update({ status: result.ok ? 'sent' : 'failed', error_message: result.error, sent_at: result.ok ? new Date().toISOString() : null })
      .eq('id', delivery.id)

    return NextResponse.json({ sent: result.ok, error: result.error })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
