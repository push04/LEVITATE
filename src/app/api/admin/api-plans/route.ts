import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

const db = () => getServiceSupabase()

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const supabase = db()
  const { data: plans, error: plansErr } = await supabase
    .from('api_plans')
    .select('*')
    .order('price_monthly', { ascending: true })

  if (plansErr) return NextResponse.json({ success: false, error: plansErr.message }, { status: 500 })

  const { data: keys } = await supabase
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
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.name) {
    return NextResponse.json({ success: false, error: 'name required' }, { status: 400 })
  }

  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { data, error } = await db()
    .from('api_plans')
    .insert({
      name: body.name,
      slug,
      price_monthly: body.price_monthly ?? 0,
      price_annual: body.price_annual ?? 0,
      call_limit: body.call_limit ?? 500,
      max_keys: body.max_keys ?? 1,
      features: body.features ?? [],
      badge: body.badge || null,
      tier: body.tier ?? 'starter',
      is_active: body.is_active ?? true,
    })
    .select()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, plan: data?.[0] ?? null }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

  const { id } = body
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.slug !== undefined) updates.slug = body.slug
  if (body.price_monthly !== undefined) updates.price_monthly = body.price_monthly
  if (body.price_annual !== undefined) updates.price_annual = body.price_annual
  if (body.call_limit !== undefined) updates.call_limit = body.call_limit
  if (body.max_keys !== undefined) updates.max_keys = body.max_keys
  if (body.features !== undefined) updates.features = body.features
  if (body.badge !== undefined) updates.badge = body.badge
  if (body.tier !== undefined) updates.tier = body.tier
  if (body.is_active !== undefined) updates.is_active = body.is_active
  const { data, error } = await db()
    .from('api_plans')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
  return NextResponse.json({ success: true, plan: data[0] })
}

export async function DELETE(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

  const { error } = await db().from('api_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, deleted: id })
}
