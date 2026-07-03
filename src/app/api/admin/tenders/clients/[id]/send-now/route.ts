import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { getAllTenders } from '@/lib/tenderpulse-analytics'
import { matchTendersForClient, buildDigestHtml } from '@/lib/tenderpulse-matcher'
import { sendTenderEmail } from '@/lib/tenderpulse-mailer'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = getServiceSupabase()

  try {
    const { data: client, error: clientErr } = await supabase.from('tender_clients').select('*').eq('id', id).single()
    if (clientErr || !client) return NextResponse.json({ error: 'client not found' }, { status: 404 })

    const tenders = await getAllTenders(supabase)
    const matches = matchTendersForClient(tenders, client)
    if (!matches.length) return NextResponse.json({ sent: false, reason: 'no matching tenders' })

    const { data: delivery, error: insertErr } = await supabase
      .from('deliveries')
      .insert({
        client_id: client.id,
        tender_ids: matches.map((t) => t.id),
        channel: 'email',
        recipient_email: client.email,
        status: 'pending',
      })
      .select()
      .single()
    if (insertErr) throw insertErr

    const result = await sendTenderEmail(
      client.email,
      `${matches.length} tender${matches.length === 1 ? '' : 's'} matching your filters — TenderPulse BJ`,
      buildDigestHtml(client.company_name, matches)
    )

    await supabase
      .from('deliveries')
      .update({
        status: result.ok ? 'sent' : 'failed',
        error_message: result.error,
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      .eq('id', delivery.id)

    return NextResponse.json({ sent: result.ok, error: result.error, tenderCount: matches.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
