import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServiceSupabase } from '@/lib/supabase'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/business/integrations/busy/agent-config
 * Returns a pre-configured config.json for the LEVITATE Sync Agent.
 * Uses the authenticated business user's session to find their API key.
 */
export async function GET() {
  const cookieStore = await cookies()
  // Always use the canonical domain so the agent pushes to the right URL
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://levitatelabs.online'

  // Get authenticated user
  const authSupabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up their active API key (key_prefix only — full key is shown once on creation)
  const service = getServiceSupabase()
  const { data: keyRow } = await service
    .from('api_keys')
    .select('key_prefix, name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const keyNote = keyRow
    ? `${keyRow.key_prefix}... — copy your full key from API Keys page`
    : 'lv_xxxxxxxxxxxxxxxxxxxx — generate one from Business Dashboard → API Keys'

  const config = {
    levitate_api_url: siteUrl,
    levitate_api_key: keyNote,
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
