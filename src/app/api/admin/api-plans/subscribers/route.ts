import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!data || !['super_admin', 'admin'].includes(data.role)) return null
  return { supabase, user }
}

export async function GET() {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { data: keys } = await ctx.supabase
    .from('api_keys')
    .select('id, user_id, key_prefix, name, requests_count, is_active, created_at, last_used_at, plan_id, plan_override_limit')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: profiles } = await ctx.supabase
    .from('profiles')
    .select('id, email, full_name')

  const { data: plans } = await ctx.supabase
    .from('api_plans')
    .select('id, name, call_limit')

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const planMap = Object.fromEntries((plans ?? []).map(p => [p.id, p]))

  const rows = (keys ?? []).map(k => ({
    ...k,
    email: profileMap[k.user_id]?.email ?? 'Unknown',
    full_name: profileMap[k.user_id]?.full_name ?? '',
    plan_name: planMap[k.plan_id ?? '']?.name ?? 'Starter (default)',
    call_limit: k.plan_override_limit ?? planMap[k.plan_id ?? '']?.call_limit ?? 500,
  }))

  return NextResponse.json({ success: true, subscribers: rows })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.key_id) return NextResponse.json({ success: false, error: 'key_id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (typeof body.plan_id === 'string') updates.plan_id = body.plan_id
  if (typeof body.plan_override_limit === 'number') updates.plan_override_limit = body.plan_override_limit

  const { error } = await ctx.supabase
    .from('api_keys')
    .update(updates)
    .eq('id', body.key_id)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
