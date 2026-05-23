import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env'
import { getPlanPrice, type BillingCycle, type OnboardingPlan } from '@/lib/onboarding'
import { validateOnboardingCoupon } from '@/lib/onboarding-coupons'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const couponCode = String(body.couponCode ?? '')
    const planId = String(body.planId ?? '')
    const billingCycle = (String(body.billingCycle ?? 'monthly') as BillingCycle) || 'monthly'

    if (!couponCode || !planId) {
      return NextResponse.json({ success: false, error: 'Coupon code and plan are required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const authSupabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    const supabase = getServiceSupabase()
    const { data: plan, error } = await supabase
      .from('onboarding_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()

    if (error || !plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    const amount = getPlanPrice(plan as OnboardingPlan, billingCycle)
    const coupon = await validateOnboardingCoupon({
      code: couponCode,
      planId,
      amount,
      userId: user?.id ?? null,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...coupon,
        originalAmount: amount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to validate coupon' },
      { status: 500 }
    )
  }
}
