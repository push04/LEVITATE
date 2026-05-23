import 'server-only'

import { getServiceSupabase } from '@/lib/supabase'

type CouponRow = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  discount_type: string
  discount_value: number | string
  max_redemptions: number | null
  redemption_count: number | null
  min_order_amount: number | string | null
  max_discount_amount: number | string | null
  valid_from: string | null
  valid_until: string | null
  applies_to_all_plans: boolean | null
  eligible_plan_ids: unknown
  usage_scope: string | null
}

export type ValidatedCoupon = {
  id: string
  code: string
  name: string
  description: string | null
  discountType: 'percentage' | 'flat'
  discountValue: number
  discountAmount: number
  finalAmount: number
}

type ValidateCouponInput = {
  code: string
  planId: string
  amount: number
  userId?: string | null
}

type RedeemableSubscription = {
  id: string
  coupon_id?: string | null
  coupon_code?: string | null
  user_id?: string | null
  company_id?: string | null
  amount?: number | string | null
  discount_amount?: number | string | null
  final_amount?: number | string | null
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase()
}

function jsonbArrayToStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter(Boolean)
}

function calculateDiscountAmount(row: CouponRow, amount: number) {
  const discountType: 'flat' | 'percentage' = row.discount_type === 'flat' ? 'flat' : 'percentage'
  const discountValue = toNumber(row.discount_value)
  const rawDiscount =
    discountType === 'flat'
      ? discountValue
      : (amount * Math.max(discountValue, 0)) / 100
  const cappedDiscount = row.max_discount_amount != null
    ? Math.min(rawDiscount, toNumber(row.max_discount_amount))
    : rawDiscount

  return {
    discountType,
    discountValue,
    discountAmount: Math.max(0, Math.min(amount, Number(cappedDiscount.toFixed(2)))),
  }
}

export async function validateOnboardingCoupon(input: ValidateCouponInput): Promise<ValidatedCoupon> {
  const normalizedCode = normalizeCouponCode(input.code)
  if (!normalizedCode) {
    throw new Error('Enter a coupon code')
  }

  const amount = Math.max(0, toNumber(input.amount))
  if (amount <= 0) {
    throw new Error('Coupon validation needs a valid plan amount')
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('onboarding_coupons')
    .select(
      'id, code, name, description, status, discount_type, discount_value, max_redemptions, redemption_count, min_order_amount, max_discount_amount, valid_from, valid_until, applies_to_all_plans, eligible_plan_ids, usage_scope'
    )
    .eq('code', normalizedCode)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const coupon = data as CouponRow | null
  if (!coupon) {
    throw new Error('Coupon code not found')
  }

  if (coupon.status !== 'active') {
    throw new Error('This coupon is not active')
  }

  const now = Date.now()
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
    throw new Error('This coupon is not active yet')
  }

  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) {
    throw new Error('This coupon has expired')
  }

  if (coupon.min_order_amount != null && amount < toNumber(coupon.min_order_amount)) {
    throw new Error(`This coupon requires a minimum order of Rs. ${toNumber(coupon.min_order_amount).toLocaleString('en-IN')}`)
  }

  if (!coupon.applies_to_all_plans) {
    const eligiblePlanIds = jsonbArrayToStrings(coupon.eligible_plan_ids)
    if (!eligiblePlanIds.includes(input.planId)) {
      throw new Error('This coupon is not available for the selected plan')
    }
  }

  const maxRedemptions = coupon.max_redemptions ?? null
  const redemptionCount = coupon.redemption_count ?? 0
  if (maxRedemptions !== null && redemptionCount >= maxRedemptions) {
    throw new Error('This coupon has reached its redemption limit')
  }

  if (coupon.usage_scope === 'per_user' && input.userId) {
    const { count, error: redemptionError } = await supabase
      .from('onboarding_coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', input.userId)
      .eq('status', 'redeemed')

    if (redemptionError) {
      throw new Error(redemptionError.message)
    }

    if ((count ?? 0) > 0) {
      throw new Error('This coupon has already been used on your account')
    }
  }

  const { discountType, discountValue, discountAmount } = calculateDiscountAmount(coupon, amount)

  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    description: coupon.description,
    discountType,
    discountValue,
    discountAmount,
    finalAmount: Math.max(0, Number((amount - discountAmount).toFixed(2))),
  }
}

export async function finalizeOnboardingCouponRedemption(subscription: RedeemableSubscription) {
  if (!subscription.coupon_id || !subscription.coupon_code) {
    return
  }

  const supabase = getServiceSupabase()
  const { data: existing, error: existingError } = await supabase
    .from('onboarding_coupon_redemptions')
    .select('id, status')
    .eq('subscription_id', subscription.id)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  const payload = {
    coupon_id: subscription.coupon_id,
    subscription_id: subscription.id,
    user_id: subscription.user_id ?? null,
    company_id: subscription.company_id ?? null,
    coupon_code: normalizeCouponCode(subscription.coupon_code),
    original_amount: toNumber(subscription.amount),
    discount_amount: toNumber(subscription.discount_amount),
    final_amount: toNumber(subscription.final_amount ?? subscription.amount),
    status: 'redeemed',
    metadata: {
      redeemedAt: new Date().toISOString(),
    },
  }

  if (existing?.id) {
    if (existing.status !== 'redeemed') {
      const { error } = await supabase
        .from('onboarding_coupon_redemptions')
        .update({
          ...payload,
          redeemed_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        throw new Error(error.message)
      }
    }
  } else {
    const { error } = await supabase
      .from('onboarding_coupon_redemptions')
      .insert({
        ...payload,
        redeemed_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(error.message)
    }
  }

  const { count, error: countError } = await supabase
    .from('onboarding_coupon_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', subscription.coupon_id)
    .eq('status', 'redeemed')

  if (countError) {
    throw new Error(countError.message)
  }

  const { error: updateError } = await supabase
    .from('onboarding_coupons')
    .update({
      redemption_count: count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.coupon_id)

  if (updateError) {
    throw new Error(updateError.message)
  }
}
