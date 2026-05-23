import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { normalizeCouponCode } from '@/lib/onboarding-coupons'

export const dynamic = 'force-dynamic'

function normalizeEligiblePlanIds(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter(Boolean)
}

function normalizeCouponPayload(body: Record<string, unknown>) {
  return {
    code: normalizeCouponCode(String(body.code ?? '')),
    name: String(body.name ?? '').trim(),
    description: String(body.description ?? '').trim() || null,
    status: String(body.status ?? 'draft').trim() || 'draft',
    discount_type: body.discount_type === 'flat' ? 'flat' : 'percentage',
    discount_value: Number(body.discount_value ?? 0),
    max_redemptions: body.max_redemptions === '' || body.max_redemptions == null ? null : Number(body.max_redemptions),
    min_order_amount: body.min_order_amount === '' || body.min_order_amount == null ? null : Number(body.min_order_amount),
    max_discount_amount: body.max_discount_amount === '' || body.max_discount_amount == null ? null : Number(body.max_discount_amount),
    valid_from: body.valid_from ? new Date(String(body.valid_from)).toISOString() : null,
    valid_until: body.valid_until ? new Date(String(body.valid_until)).toISOString() : null,
    applies_to_all_plans: body.applies_to_all_plans !== false,
    eligible_plan_ids: normalizeEligiblePlanIds(body.eligible_plan_ids),
    usage_scope: body.usage_scope === 'global' ? 'global' : 'per_user',
    is_stackable: Boolean(body.is_stackable),
    updated_at: new Date().toISOString(),
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const payload = normalizeCouponPayload(body)
    if (!payload.code || !payload.name) {
      return NextResponse.json({ success: false, error: 'Coupon code and name are required' }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('onboarding_coupons')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to update coupon' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('onboarding_coupons').delete().eq('id', id)
    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to delete coupon' },
      { status: 500 }
    )
  }
}
