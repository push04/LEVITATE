import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { randomBytes, createHash } from 'crypto'

function generateKey() { return `lv_${randomBytes(24).toString('hex')}` }
function hashKey(key: string) { return createHash('sha256').update(key).digest('hex') }

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const { user_id, plan_id, key_name } = (body ?? {}) as {
    user_id?: string; plan_id?: string; key_name?: string
  }

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const supabase = getServiceSupabase()
  const key = generateKey()
  const keyHash = hashKey(key)
  const keyPrefix = key.slice(0, 12)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: key_name?.trim() || 'Admin Key',
      plan_id: plan_id || null,
      is_active: true,
    })
    .select('id, key_prefix, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    key_id: data.id,
    key,
    key_prefix: data.key_prefix,
    warning: 'Copy this key now — it will never be shown again.',
  })
}

export async function PATCH(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { key_id, is_active, plan_id, plan_override_limit } = (body ?? {}) as {
    key_id?: string; is_active?: boolean; plan_id?: string | null; plan_override_limit?: number | null
  }

  if (!key_id) return NextResponse.json({ error: 'key_id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof is_active === 'boolean') updates.is_active = is_active
  if (plan_id !== undefined) updates.plan_id = plan_id
  if (plan_override_limit !== undefined) updates.plan_override_limit = plan_override_limit

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('api_keys').update(updates).eq('id', key_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key_id = req.nextUrl.searchParams.get('key_id')
  if (!key_id) return NextResponse.json({ error: 'key_id required' }, { status: 400 })

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('api_keys').delete().eq('id', key_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
