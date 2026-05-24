/**
 * Busy Software Outbound Webhook Receiver
 *
 * Configure in BUSY: Setup → SMS API → set URL to:
 *   https://yourdomain.com/api/webhook/busy?secret=YOUR_WEBHOOK_SECRET
 *
 * BUSY sends HTTP GET with params: mobileno, text (and optional custom template vars).
 * Parse the `text` param to extract invoice data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const secret = searchParams.get('secret')
  const mobileno = searchParams.get('mobileno') ?? searchParams.get('mobile') ?? ''
  const text = searchParams.get('text') ?? searchParams.get('message') ?? ''
  const apikey = searchParams.get('apikey') ?? ''

  const supabase = getServiceSupabase()

  // Validate secret
  const { data: cfgRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'busy_integration_config')
    .maybeSingle()

  const config = cfgRow?.value as Record<string, unknown> | null
  const expectedSecret = config?.webhook_secret as string | undefined

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse invoice info from the text message
  // Busy sends messages like: "Invoice #1234 created for Party Name. Amount: ₹5000. Date: 01/05/2026"
  const invoiceMatch = text.match(/invoice\s*[#no.]*\s*(\S+)/i)
  const amountMatch = text.match(/(?:amount|total|rs\.?|₹)\s*:?\s*([\d,]+(?:\.\d+)?)/i)
  const partyMatch = text.match(/(?:for|to|party)\s*:?\s*([^.]+?)(?:\.|amount|total|date|$)/i)
  const dateMatch = text.match(/(?:date|dated)\s*:?\s*([\d/\-]+)/i)

  const eventData = {
    mobile: mobileno,
    raw_text: text,
    invoice_no: invoiceMatch?.[1] ?? null,
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    party_name: partyMatch?.[1]?.trim() ?? null,
    event_date: dateMatch?.[1] ?? null,
    received_at: new Date().toISOString(),
    source: 'busy_webhook',
    apikey_hint: apikey.slice(0, 4) || null,
  }

  // Store the event
  await supabase.from('settings').insert({
    key: `busy_webhook_event_${Date.now()}`,
    value: eventData,
  })

  // If we have a party_name and mobile, try to match/create a lead
  if (eventData.party_name) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .ilike('business_name', eventData.party_name)
      .maybeSingle()

    if (!existing) {
      await supabase.from('leads').insert({
        business_name: eventData.party_name,
        phone: mobileno || null,
        notes: `Busy Invoice ${eventData.invoice_no ?? ''} — ₹${eventData.amount ?? ''} on ${eventData.event_date ?? ''}`,
        source: 'busy_webhook',
        status: 'New',
        created_at: new Date().toISOString(),
      })
    }
  }

  // Log to sync logs
  await supabase.from('busy_sync_logs').insert({
    sync_type: 'webhook',
    entity_type: 'invoice_event',
    status: 'success',
    records_total: 1,
    records_imported: 1,
    records_skipped: 0,
    records_failed: 0,
    metadata: eventData,
    created_at: new Date().toISOString(),
  })

  // BUSY expects a specific response text — usually just "OK" or a 200
  return new NextResponse('OK', { status: 200 })
}

// Also accept POST (some configurations)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { searchParams } = req.nextUrl

  const supabase = getServiceSupabase()
  const { data: cfgRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'busy_integration_config')
    .maybeSingle()

  const config = cfgRow?.value as Record<string, unknown> | null
  const expectedSecret = config?.webhook_secret as string | undefined
  const secret = searchParams.get('secret') ?? body?.secret

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabase.from('settings').insert({
    key: `busy_webhook_post_${Date.now()}`,
    value: { ...body, received_at: new Date().toISOString(), source: 'busy_webhook_post' },
  })

  return NextResponse.json({ success: true })
}
