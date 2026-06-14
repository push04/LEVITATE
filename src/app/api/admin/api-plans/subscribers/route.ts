import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()

  const [keysRes, profilesRes, plansRes] = await Promise.all([
    supabase
      .from('api_keys')
      .select('id, user_id, key_prefix, name, requests_count, is_active, created_at, last_used_at, plan_id, plan_override_limit')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('profiles').select('id, email, full_name'),
    supabase.from('api_plans').select('id, name, call_limit'),
  ])

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]))
  const planMap = Object.fromEntries((plansRes.data ?? []).map(p => [p.id, p]))

  const rows = (keysRes.data ?? []).map(k => ({
    ...k,
    email: profileMap[k.user_id]?.email ?? 'Unknown',
    full_name: profileMap[k.user_id]?.full_name ?? '',
    plan_name: planMap[k.plan_id ?? '']?.name ?? 'Starter (default)',
    call_limit: k.plan_override_limit ?? planMap[k.plan_id ?? '']?.call_limit ?? 500,
  }))

  return NextResponse.json({ success: true, subscribers: rows })
}

export async function PATCH(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.key_id) return NextResponse.json({ success: false, error: 'key_id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (typeof body.plan_id === 'string') updates.plan_id = body.plan_id
  if (typeof body.plan_override_limit === 'number') updates.plan_override_limit = body.plan_override_limit

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('api_keys').update(updates).eq('id', body.key_id)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
