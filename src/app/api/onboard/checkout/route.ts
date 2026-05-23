import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env'
import { createRazorpayPlan, createRazorpaySubscription } from '@/lib/payments/razorpay-subscriptions'
import {
  BillingCycle,
  ensureWorkspaceSlug,
  getPlanPrice,
  getWorkspacePath,
  getWorkspaceUrl,
  isReservedWorkspaceSlug,
  type OnboardingPlan
} from '@/lib/onboarding'
import { normalizeCouponCode, validateOnboardingCoupon } from '@/lib/onboarding-coupons'

export const dynamic = 'force-dynamic'

function isContactOnlyPlan(plan: OnboardingPlan, amount: number) {
  return (
    amount <= 0 ||
    /enterprise|custom/i.test(plan.slug || '') ||
    /enterprise|custom|contact/i.test(plan.name || '') ||
    /contact/i.test(plan.cta_label || '')
  )
}

async function resolveWorkspaceSlug(supabase: ReturnType<typeof getServiceSupabase>, companyName: string) {
  const baseSlug = ensureWorkspaceSlug(companyName)
  let suffix = 1

  while (true) {
    const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`

    if (isReservedWorkspaceSlug(candidate)) {
      suffix += 1
      continue
    }

    const { count, error } = await supabase
      .from('onboarding_subscriptions')
      .select('id', { count: 'exact', head: true })
      .or(`workspace_slug.eq.${candidate},subdomain_slug.eq.${candidate}`)

    if (error) {
      throw error
    }

    if (!count) {
      return candidate
    }

    suffix += 1
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authSupabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Read-only session check in route handlers.
          },
        },
      }
    )

    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Please sign in before purchasing a plan' }, { status: 401 })
    }

    const body = await request.json()
    const planId = body.planId as string
    const billingCycle = (body.billingCycle as BillingCycle) || 'monthly'
    const companyName = String(body.companyName || '').trim()
    const ownerName = String(body.ownerName || '').trim()
    const phone = String(body.phone || '').trim()
    const couponCode = normalizeCouponCode(String(body.couponCode || ''))
    const email = user.email?.trim() ?? ''

    if (!planId || !companyName || !ownerName || !email) {
      return NextResponse.json({ success: false, error: 'Plan, company, owner, and account email are required' }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data: plan, error } = await supabase.from('onboarding_plans').select('*').eq('id', planId).single()
    if (error || !plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    const selectedPlan = plan as OnboardingPlan
    const baseAmount = getPlanPrice(selectedPlan, billingCycle)

    if (isContactOnlyPlan(selectedPlan, baseAmount)) {
      return NextResponse.json(
        {
          success: false,
          error: 'This plan requires a direct consultation. Please contact Levitate to proceed.',
          contactUrl: '/#contact'
        },
        { status: 400 }
      )
    }

    const appliedCoupon = couponCode
      ? await validateOnboardingCoupon({
          code: couponCode,
          planId: selectedPlan.id,
          amount: baseAmount,
          userId: user.id,
        })
      : null
    const finalAmount = appliedCoupon?.finalAmount ?? baseAmount
    const durationLabel = billingCycle === 'annual' ? 'yearly' : 'monthly'
    const razorpayPlanIdField = billingCycle === 'annual' ? 'annual_razorpay_plan_id' : 'monthly_razorpay_plan_id'
    let razorpayPlanId = selectedPlan[razorpayPlanIdField]

    if (!razorpayPlanId || Boolean(appliedCoupon)) {
      const createdPlan = await createRazorpayPlan({
        name: `${selectedPlan.name} - ${durationLabel}${appliedCoupon ? ` - ${appliedCoupon.code}` : ''}`,
        amountInRupees: finalAmount,
        period: billingCycle === 'annual' ? 'yearly' : 'monthly',
        description: selectedPlan.description ?? selectedPlan.tagline ?? selectedPlan.name
      })

      razorpayPlanId = createdPlan.id
      if (!appliedCoupon) {
        await supabase.from('onboarding_plans').update({ [razorpayPlanIdField]: razorpayPlanId }).eq('id', selectedPlan.id)
      }
    }

    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    let companyId = existingCompany?.id ?? null
    if (!companyId) {
      const { data: createdCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          owner_id: user.id
        })
        .select('id')
        .single()

      if (companyError) {
        return NextResponse.json({ success: false, error: companyError.message }, { status: 500 })
      }

      companyId = createdCompany?.id ?? null
    } else {
      await supabase.from('companies').update({ name: companyName }).eq('id', companyId)
    }

    const workspaceSlug = await resolveWorkspaceSlug(supabase, companyName)
    const workspacePath = getWorkspacePath(workspaceSlug)
    const workspaceUrl = getWorkspaceUrl(workspaceSlug)
    const referenceId = `onboard_${selectedPlan.slug}_${Date.now()}`

    const subscription = await createRazorpaySubscription({
      planId: razorpayPlanId,
      totalCount: billingCycle === 'annual' ? 1 : 12,
      customerName: ownerName,
      customerEmail: email,
      referenceId,
      notes: {
        plan_slug: selectedPlan.slug,
        company_name: companyName,
        billing_cycle: billingCycle,
        workspace_slug: workspaceSlug,
        workspace_url: workspaceUrl,
        backlink_url: workspaceUrl,
        coupon_code: appliedCoupon?.code ?? ''
      }
    })

    const { data: signup, error: signupError } = await supabase.from('onboarding_subscriptions').insert({
      plan_id: selectedPlan.id,
      company_name: companyName,
      owner_name: ownerName,
      email,
      phone: phone || null,
      billing_cycle: billingCycle,
      amount: finalAmount,
      status: 'pending',
      subdomain_slug: workspaceSlug,
      subdomain_url: workspaceUrl,
      workspace_slug: workspaceSlug,
      workspace_path: workspacePath,
      workspace_backlink_url: workspaceUrl,
      workspace_mode: 'backlink',
      backlink_enabled: true,
      razorpay_plan_id: razorpayPlanId,
      razorpay_subscription_id: subscription.id,
      razorpay_short_url: subscription.short_url ?? null,
      user_id: user.id,
      company_id: companyId,
      coupon_id: appliedCoupon?.id ?? null,
      coupon_code: appliedCoupon?.code ?? null,
      coupon_discount_type: appliedCoupon?.discountType ?? null,
      coupon_discount_value: appliedCoupon?.discountValue ?? null,
      discount_amount: appliedCoupon?.discountAmount ?? 0,
      final_amount: finalAmount,
      notes: {
        reference_id: referenceId,
        plan_name: selectedPlan.name,
        user_id: user.id,
        company_id: companyId,
        account_email: email,
        workspace_slug: workspaceSlug,
        workspace_url: workspaceUrl,
        backlink_url: workspaceUrl,
        original_amount: baseAmount,
        final_amount: finalAmount,
        discount_amount: appliedCoupon?.discountAmount ?? 0,
        coupon_code: appliedCoupon?.code ?? null,
        coupon_name: appliedCoupon?.name ?? null
      }
    }).select().single()

    if (signupError) {
      return NextResponse.json({ success: false, error: signupError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      signup,
      checkoutUrl: subscription.short_url,
      workspaceSlug,
      workspacePath,
      workspaceUrl,
      subdomainUrl: workspaceUrl,
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID ?? '',
      accountEmail: email,
      dashboardUrl: '/business/dashboard?onboard=success',
      companyFallbackUrl: '/company',
      pricing: {
        originalAmount: baseAmount,
        finalAmount,
        discountAmount: appliedCoupon?.discountAmount ?? 0,
        couponCode: appliedCoupon?.code ?? null
      }
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}

