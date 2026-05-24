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

  const { data: plans } = await ctx.supabase
    .from('api_plans')
    .select('*')
    .order('price_monthly', { ascending: true })

  const { data: keys } = await ctx.supabase
    .from('api_keys')
    .select('plan_id, is_active, requests_count')

  const planStats = (plans ?? []).map(plan => {
    const planKeys = (keys ?? []).filter(k => k.plan_id === plan.id && k.is_active)
    return {
      ...plan,
      subscriber_count: planKeys.length,
      total_calls: planKeys.reduce((sum, k) => sum + (k.requests_count ?? 0), 0),
    }
  })

  return NextResponse.json({ success: true, plans: planStats })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ success: false, error: 'name and slug required' }, { status: 400 })
  }

  const { data, error } = await ctx.supabase
    .from('api_plans')
    .insert({
      name: body.name,
      slug: body.slug,
      price_monthly: body.price_monthly ?? 0,
      price_annual: body.price_annual ?? 0,
      call_limit: body.call_limit ?? 500,
      max_keys: body.max_keys ?? 1,
      features: body.features ?? [],
      badge: body.badge ?? '',
      tier: body.tier ?? 'starter',
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, plan: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

  const { id, ...updates } = body
  const { data, error } = await ctx.supabase
    .from('api_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, plan: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

  const { error } = await ctx.supabase.from('api_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, deleted: id })
}
