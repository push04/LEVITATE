import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { randomBytes, createHash } from 'crypto'

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  starter: 5000,
  pro: 50000,
  enterprise: 1000000,
}

function generateKey(): string {
  return `lv_${randomBytes(24).toString('hex')}`
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, plan_id, requests_count, plan_override_limit, is_active, created_at, last_used_at, key_prefix')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, keys: data })
}

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { name, plan = 'starter', business_id } = body as {
    name?: string; plan?: string; business_id?: string
  }

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const key = generateKey()
  const keyHash = hashKey(key)
  const keyPrefix = key.slice(0, 12) + '...'

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      plan_override_limit: PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter,
      requests_count: 0,
      is_active: true,
    })
    .select('id, name, plan_id, plan_override_limit, key_prefix')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    key,
    id: data.id,
    name: data.name,
    plan_id: data.plan_id,
    requests_limit: data.plan_override_limit,
    warning: 'This is the only time the full key is shown. Copy it now.',
  }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, is_active, plan } = body as { id?: string; is_active?: boolean; plan?: string }

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (is_active !== undefined) update.is_active = is_active
  if (plan) {
    update.plan_override_limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter
  }

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('api_keys').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('api_keys').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

