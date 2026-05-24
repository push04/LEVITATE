import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

interface CustomerRow {
  party_name?: string
  mobile?: string
  email?: string
  city?: string
  state?: string
  address?: string
  gstin?: string
  credit_limit?: number | string
  opening_balance?: number | string
  account_group?: string
  [key: string]: unknown
}

interface InvoiceRow {
  bill_no?: string
  bill_date?: string
  party_name?: string
  net_amount?: number | string
  gross_amount?: number | string
  tax_amount?: number | string
  vch_type?: number | string
  [key: string]: unknown
}

interface IngestPayload {
  customers?: CustomerRow[]
  invoices?: InvoiceRow[]
  agent_version?: string
  synced_at?: string
}

export async function POST(req: NextRequest) {
  // Authenticate with LEVITATE API key
  const apiKey = req.headers.get('x-levitate-key') ?? ''
  const supabase = getServiceSupabase()

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing x-levitate-key header' }, { status: 401 })
  }

  // Validate key against api_keys table
  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('id, user_id, is_active, plan_id')
    .eq('key_hash', hashApiKey(apiKey))
    .maybeSingle()

  if (!keyRow?.is_active) {
    return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
  }

  // Look up the company_id for this user so leads appear in their business dashboard
  const { data: companyRow } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', keyRow.user_id)
    .maybeSingle()
  const companyId: string | null = companyRow?.id ?? null

  let body: IngestPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const customers: CustomerRow[] = Array.isArray(body.customers) ? body.customers : []
  const invoices: InvoiceRow[] = Array.isArray(body.invoices) ? body.invoices : []

  let custImported = 0, custSkipped = 0, custFailed = 0
  let invImported = 0, invFailed = 0

  // ── Customers → leads ────────────────────────────────────────────────────
  if (customers.length) {
    const leads = customers
      .filter(c => c.party_name || c.name)
      .map(c => {
        const name = String(c.party_name ?? (c as Record<string, unknown>).name ?? '').trim()
        const notesParts = [
          c.gstin ? `GSTIN: ${c.gstin}` : null,
          c.opening_balance != null ? `Outstanding: ₹${c.opening_balance}` : null,
          c.address ? `Address: ${c.address}` : null,
          c.state ? `State: ${c.state}` : null,
        ].filter(Boolean)

        return {
          name: name || 'Unknown',
          email: c.email?.toString().trim().toLowerCase() || null,
          phone: c.mobile?.toString().trim() || null,
          city: c.city?.toString().trim() || null,
          notes: notesParts.length ? notesParts.join(' | ') : null,
          budget: c.credit_limit ? `₹${c.credit_limit}` : null,
          source: 'busy_agent',
          status: 'New',
          company_id: companyId,
          user_id: keyRow.user_id,
          created_at: new Date().toISOString(),
        }
      })

    const withEmail = leads.filter(l => l.email)
    const withoutEmail = leads.filter(l => !l.email)

    if (withEmail.length) {
      const { data, error } = await supabase
        .from('leads')
        .upsert(withEmail, { onConflict: 'email', ignoreDuplicates: true })
        .select('id')
      if (error) custFailed += withEmail.length
      else {
        custImported += data?.length ?? 0
        custSkipped += withEmail.length - (data?.length ?? 0)
      }
    }

    if (withoutEmail.length) {
      const { data, error } = await supabase.from('leads').insert(withoutEmail).select('id')
      if (error) custFailed += withoutEmail.length
      else custImported += data?.length ?? 0
    }
  }

  // ── Invoices → settings (raw store) ─────────────────────────────────────
  if (invoices.length) {
    const rows = invoices
      .filter(inv => inv.bill_no)
      .map(inv => ({
        key: `busy_agent_inv_${inv.bill_no}_${inv.party_name ?? 'unknown'}`.slice(0, 200),
        value: inv,
      }))

    if (rows.length) {
      const { error } = await supabase.from('settings').upsert(rows)
      if (error) invFailed += rows.length
      else invImported += rows.length
    }
  }

  // ── Log to busy_sync_logs ────────────────────────────────────────────────
  await supabase.from('busy_sync_logs').insert({
    sync_type: 'agent_push',
    entity_type: 'customers+invoices',
    status:
      custFailed + invFailed > 0 && custImported + invImported === 0
        ? 'failed'
        : custFailed + invFailed > 0
        ? 'partial'
        : 'success',
    records_total: customers.length + invoices.length,
    records_imported: custImported + invImported,
    records_skipped: custSkipped,
    records_failed: custFailed + invFailed,
    metadata: {
      agent_version: body.agent_version ?? null,
      synced_at: body.synced_at ?? null,
      customers_total: customers.length,
      invoices_total: invoices.length,
    },
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({
    success: true,
    customers: { total: customers.length, imported: custImported, skipped: custSkipped, failed: custFailed },
    invoices: { total: invoices.length, imported: invImported, failed: invFailed },
  })
}

function hashApiKey(key: string): string {
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHash('sha256').update(key).digest('hex')
}
