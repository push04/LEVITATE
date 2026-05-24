import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

// Maps Busy party/customer CSV columns to CRM lead fields
const BUSY_PARTY_MAP: Record<string, string> = {
  'account name': 'business_name',
  'name': 'business_name',
  'party name': 'business_name',
  'contact name': 'name',
  'mobile': 'phone',
  'mobile no': 'phone',
  'mobile no.': 'phone',
  'phone': 'phone',
  'phone no': 'phone',
  'email': 'email',
  'email id': 'email',
  'city': 'city',
  'gstin': 'gstin',
  'gst no': 'gstin',
  'gst number': 'gstin',
  'opening balance': 'budget',
  'balance': 'budget',
  'credit limit': 'credit_limit',
  'address': 'address',
  'pincode': 'pincode',
  'state': 'state',
  'account group': 'service_category',
  'group': 'service_category',
}

function normalizeKey(k: string) {
  return k.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  // Expect { rows: Record<string, string>[], source_type: 'party' | 'invoice' }
  const rows: Record<string, string>[] = body?.rows
  const sourceType: string = body?.source_type ?? 'party'

  if (!Array.isArray(rows) || !rows.length) {
    return NextResponse.json({ error: 'rows array required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  if (sourceType === 'party') {
    // Map each row to a lead
    const leads = rows.map(row => {
      const lead: Record<string, string | null> = {}
      for (const [k, v] of Object.entries(row)) {
        const mapped = BUSY_PARTY_MAP[normalizeKey(k)]
        if (mapped && v?.trim()) lead[mapped] = v.trim()
      }

      const notesParts = [
        lead.gstin ? `GSTIN: ${lead.gstin}` : null,
        lead.address ? `Address: ${lead.address}` : null,
        lead.state ? `State: ${lead.state}` : null,
        lead.pincode ? `PIN: ${lead.pincode}` : null,
        lead.credit_limit ? `Credit Limit: ₹${lead.credit_limit}` : null,
      ].filter(Boolean)

      return {
        business_name: lead.business_name ?? lead.name ?? 'Unknown',
        email: lead.email?.toLowerCase() || null,
        phone: lead.phone || null,
        city: lead.city || null,
        service_category: lead.service_category || null,
        budget: lead.budget || null,
        notes: notesParts.length ? notesParts.join(' | ') : null,
        source: 'busy_csv_upload',
        status: 'New',
        created_at: new Date().toISOString(),
      }
    })

    let imported = 0, skipped = 0, failed = 0

    const withEmail = leads.filter(l => l.email)
    const withoutEmail = leads.filter(l => !l.email)

    if (withEmail.length) {
      const { data, error } = await supabase
        .from('leads')
        .upsert(withEmail, { onConflict: 'email', ignoreDuplicates: true })
        .select('id')
      if (error) failed += withEmail.length
      else { imported += data?.length ?? 0; skipped += withEmail.length - (data?.length ?? 0) }
    }
    if (withoutEmail.length) {
      const { data, error } = await supabase.from('leads').insert(withoutEmail).select('id')
      if (error) failed += withoutEmail.length
      else imported += data?.length ?? 0
    }

    // Log sync
    await supabase.from('busy_sync_logs').insert({
      sync_type: 'csv_upload',
      entity_type: 'customers',
      status: failed > 0 && imported === 0 ? 'failed' : failed > 0 ? 'partial' : 'success',
      records_total: rows.length,
      records_imported: imported,
      records_skipped: skipped,
      records_failed: failed,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, total: rows.length, imported, skipped, failed })
  }

  // For invoice type — store raw invoice data
  if (sourceType === 'invoice') {
    const invoiceRows = rows.map((row, i) => ({
      key: `busy_invoice_upload_${Date.now()}_${i}`,
      value: row,
    }))

    const { error } = await supabase.from('settings').upsert(invoiceRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('busy_sync_logs').insert({
      sync_type: 'csv_upload',
      entity_type: 'invoices',
      status: 'success',
      records_total: rows.length,
      records_imported: rows.length,
      records_skipped: 0,
      records_failed: 0,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, total: rows.length, imported: rows.length })
  }

  return NextResponse.json({ error: 'Unknown source_type' }, { status: 400 })
}
