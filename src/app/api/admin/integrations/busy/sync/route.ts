import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

interface BusyCustomer {
  name: string
  mobile?: string
  email?: string
  city?: string
  gstin?: string
  credit_limit?: number
  balance?: number
  address?: string
}

interface BusyInvoice {
  party_name?: string
  bill_no?: string
  date?: string
  total?: number
  items?: Array<{ name: string; qty: number; rate: number; amount: number }>
  cgst?: number
  sgst?: number
  igst?: number
  net_amount?: number
}

interface BusyProduct {
  name: string
  unit?: string
  rate?: number
  hsn_code?: string
  stock?: number
}

interface SyncResult {
  entity: string
  total: number
  imported: number
  skipped: number
  failed: number
  error?: string
}

async function fetchBusyNotify(baseUrl: string, token: string, endpoint: string) {
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`BusyNotify ${endpoint} → HTTP ${res.status}`)
  return res.json()
}

async function syncCustomers(token: string, baseUrl: string, supabase: ReturnType<typeof getServiceSupabase>): Promise<SyncResult> {
  const result: SyncResult = { entity: 'customers', total: 0, imported: 0, skipped: 0, failed: 0 }
  try {
    const data = await fetchBusyNotify(baseUrl, token, '/api/v1/customers')
    const customers: BusyCustomer[] = Array.isArray(data) ? data : (data?.data ?? data?.customers ?? [])
    result.total = customers.length

    const leads = customers.map((c: BusyCustomer) => ({
      business_name: c.name,
      email: c.email?.trim().toLowerCase() || null,
      phone: c.mobile?.trim() || null,
      city: c.city?.trim() || null,
      notes: [
        c.gstin ? `GSTIN: ${c.gstin}` : null,
        c.balance != null ? `Outstanding: ₹${c.balance}` : null,
        c.address ? `Address: ${c.address}` : null,
      ].filter(Boolean).join(' | ') || null,
      budget: c.credit_limit ? `₹${c.credit_limit}` : null,
      source: 'busy_sync',
      status: 'New',
      created_at: new Date().toISOString(),
    }))

    const withEmail = leads.filter(l => l.email)
    const withoutEmail = leads.filter(l => !l.email)

    if (withEmail.length) {
      const { data: ins, error } = await supabase
        .from('leads')
        .upsert(withEmail, { onConflict: 'email', ignoreDuplicates: true })
        .select('id')
      if (error) { result.error = error.message; result.failed = withEmail.length }
      else { result.imported += ins?.length ?? 0; result.skipped += withEmail.length - (ins?.length ?? 0) }
    }

    if (withoutEmail.length) {
      const { data: ins, error } = await supabase.from('leads').insert(withoutEmail).select('id')
      if (error) result.failed += withoutEmail.length
      else result.imported += ins?.length ?? 0
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : 'Fetch failed'
    result.failed = result.total
  }
  return result
}

async function syncInvoices(token: string, baseUrl: string, supabase: ReturnType<typeof getServiceSupabase>): Promise<SyncResult> {
  const result: SyncResult = { entity: 'invoices', total: 0, imported: 0, skipped: 0, failed: 0 }
  try {
    const data = await fetchBusyNotify(baseUrl, token, '/api/v1/bills')
    const invoices: BusyInvoice[] = Array.isArray(data) ? data : (data?.data ?? data?.bills ?? [])
    result.total = invoices.length

    const rows = invoices
      .filter(inv => inv.party_name)
      .map((inv: BusyInvoice) => ({
        key: `busy_invoice_${inv.bill_no}_${inv.party_name}`,
        value: inv,
      }))

    if (rows.length) {
      const { error } = await supabase
        .from('settings')
        .upsert(rows.map(r => ({ key: r.key, value: r.value })))
      if (error) { result.error = error.message; result.failed = rows.length }
      else result.imported = rows.length
    }

    result.skipped = result.total - result.imported - result.failed
  } catch (e) {
    result.error = e instanceof Error ? e.message : 'Fetch failed'
    result.failed = result.total
  }
  return result
}

async function syncProducts(token: string, baseUrl: string, supabase: ReturnType<typeof getServiceSupabase>): Promise<SyncResult> {
  const result: SyncResult = { entity: 'products', total: 0, imported: 0, skipped: 0, failed: 0 }
  try {
    const data = await fetchBusyNotify(baseUrl, token, '/api/v1/products')
    const products: BusyProduct[] = Array.isArray(data) ? data : (data?.data ?? data?.products ?? [])
    result.total = products.length

    const rows = products.map((p: BusyProduct, i: number) => ({
      key: `busy_product_${i}_${p.name}`,
      value: p,
    }))

    if (rows.length) {
      const { error } = await supabase.from('settings').upsert(rows.map(r => ({ key: r.key, value: r.value })))
      if (error) result.failed = rows.length
      else result.imported = rows.length
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : 'Fetch failed'
  }
  return result
}


export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { entity?: string }
  const supabase = getServiceSupabase()

  // Load config
  const { data: cfgRow } = await supabase.from('settings').select('value').eq('key', 'busy_integration_config').maybeSingle()
  const config = cfgRow?.value as Record<string, unknown> | null
  if (!config?.busynotify_token) {
    return NextResponse.json({ error: 'BusyNotify token not configured' }, { status: 400 })
  }

  const token = config.busynotify_token as string
  const baseUrl = (config.busynotify_base_url as string) || 'https://api.busynotify.in'
  const entity = body.entity // if provided, sync only this entity

  const results: SyncResult[] = []

  if (!entity || entity === 'customers') {
    if (config.sync_customers !== false) {
      results.push(await syncCustomers(token, baseUrl, supabase))
    }
  }
  if (!entity || entity === 'invoices') {
    if (config.sync_invoices !== false) {
      results.push(await syncInvoices(token, baseUrl, supabase))
    }
  }
  if (!entity || entity === 'products') {
    if (config.sync_products === true) {
      results.push(await syncProducts(token, baseUrl, supabase))
    }
  }

  // Update last_synced_at
  await supabase.from('settings').upsert({
    key: 'busy_integration_config',
    value: { ...config, last_synced_at: new Date().toISOString() },
  })

  // Log to sync_logs if table exists
  const totalImported = results.reduce((a, r) => a + r.imported, 0)
  const totalFailed = results.reduce((a, r) => a + r.failed, 0)
  await supabase.from('busy_sync_logs').insert({
    sync_type: 'api',
    status: totalFailed > 0 && totalImported === 0 ? 'failed' : totalFailed > 0 ? 'partial' : 'success',
    records_total: results.reduce((a, r) => a + r.total, 0),
    records_imported: totalImported,
    records_skipped: results.reduce((a, r) => a + r.skipped, 0),
    records_failed: totalFailed,
    metadata: { results },
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, results })
}

