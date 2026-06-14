import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/busy/agent-config
 * Returns a pre-configured config.json for the LEVITATE Sync Agent.
 * Picks the first active API key from the DB and pre-fills levitate_api_url.
 */

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  // Always use the canonical domain — never the subdomain or request host
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://levitatelabs.online'

  // Pick first active API key
  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('key_prefix, name')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const config = {
    levitate_api_url: siteUrl,
    levitate_api_key: keyRow
      ? `${keyRow.key_prefix}... (replace with full key from Admin → API Portal)`
      : 'lv_xxxxxxxxxxxxxxxxxxxx (get from Admin → API Portal)',
    busy_data_dir: 'C:\\BusyWin\\DATA\\COMP0001',
    financial_year: 'auto',
    sync_customers: true,
    sync_invoices: true,
    sync_interval_minutes: 60,
  }

  const json = JSON.stringify(config, null, 2)

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="config.json"',
    },
  })
}

