import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'

const CONFIG_KEY = 'busy_integration_config'

export interface BusyConfig {
  integration_type: 'manual' | 'busynotify' | 'webhook'
  busynotify_token: string
  busynotify_base_url: string
  sync_enabled: boolean
  sync_frequency_minutes: number
  sync_customers: boolean
  sync_invoices: boolean
  sync_products: boolean
  sync_ledger: boolean
  webhook_secret: string
  last_synced_at: string | null
}

const DEFAULT_CONFIG: BusyConfig = {
  integration_type: 'manual',
  busynotify_token: '',
  busynotify_base_url: 'https://api.busynotify.in',
  sync_enabled: false,
  sync_frequency_minutes: 60,
  sync_customers: true,
  sync_invoices: true,
  sync_products: false,
  sync_ledger: false,
  webhook_secret: randomBytes(16).toString('hex'),
  last_synced_at: null,
}


export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', CONFIG_KEY)
    .maybeSingle()

  const config: BusyConfig = data?.value
    ? { ...DEFAULT_CONFIG, ...(data.value as Partial<BusyConfig>) }
    : DEFAULT_CONFIG

  return NextResponse.json({ success: true, config })
}


export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const supabase = getServiceSupabase()

  // Merge with existing config to preserve webhook_secret
  const { data: existing } = await supabase
    .from('settings')
    .select('value')
    .eq('key', CONFIG_KEY)
    .maybeSingle()

  const currentConfig: BusyConfig = existing?.value
    ? { ...DEFAULT_CONFIG, ...(existing.value as Partial<BusyConfig>) }
    : DEFAULT_CONFIG

  const newConfig: BusyConfig = { ...currentConfig, ...body }

  const { error } = await supabase
    .from('settings')
    .upsert({ key: CONFIG_KEY, value: newConfig })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, config: newConfig })
}

