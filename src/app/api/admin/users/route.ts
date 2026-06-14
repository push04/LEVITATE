import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { randomBytes, createHash } from 'crypto'

function generateKey() { return `lv_${randomBytes(24).toString('hex')}` }
function hashKey(key: string) { return createHash('sha256').update(key).digest('hex') }

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const supabase = getServiceSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('email', email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ found: false })

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, key_prefix, name, is_active, plan_id, plan_override_limit, requests_count, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const { data: plans } = await supabase
    .from('api_plans')
    .select('id, name, call_limit')

  const planMap = Object.fromEntries((plans ?? []).map(p => [p.id, p]))
  const enrichedKeys = (keys ?? []).map(k => ({
    ...k,
    plan_name: planMap[k.plan_id ?? '']?.name ?? 'No Plan',
    call_limit: k.plan_override_limit ?? planMap[k.plan_id ?? '']?.call_limit ?? 0,
  }))

  return NextResponse.json({ found: true, profile, keys: enrichedKeys })
}

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { email, full_name, plan_id, key_name } = (body ?? {}) as {
    email?: string; full_name?: string; plan_id?: string; key_name?: string
  }

  if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const cleanEmail = email.trim().toLowerCase()
  const supabase = getServiceSupabase()

  let userId: string

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle()

  if (profile) {
    userId = profile.id
  } else {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { full_name: full_name?.trim() || '' },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
    userId = authUser.user.id

    await supabase.from('profiles').upsert({
      id: userId,
      email: cleanEmail,
      full_name: full_name?.trim() || '',
    }, { onConflict: 'id' })
  }

  const key = generateKey()
  const keyHash = hashKey(key)
  const keyPrefix = key.slice(0, 12)

  const { data: keyRow, error: keyError } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: key_name?.trim() || 'Admin Key',
      plan_id: plan_id || null,
      is_active: true,
    })
    .select('id, key_prefix, name')
    .single()

  if (keyError) return NextResponse.json({ error: keyError.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    user_id: userId,
    is_new_user: !profile,
    key_id: keyRow.id,
    key,
    key_prefix: keyRow.key_prefix,
    warning: 'Copy this key now — it will never be shown again.',
  })
}
