import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { upsertBusinessProfile } from '@/lib/business-auth'
import { getServiceSupabase } from '@/lib/supabase'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env'
import { verifyRazorpaySubscriptionSignature } from '@/lib/payments/razorpay-subscriptions'
import { sendOnboardingConfirmationEmail } from '@/lib/onboarding-confirmation'
import { finalizeOnboardingCouponRedemption } from '@/lib/onboarding-coupons'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const razorpayPaymentId = String(body.razorpay_payment_id || '')
    const razorpaySubscriptionId = String(body.razorpay_subscription_id || '')
    const razorpaySignature = String(body.razorpay_signature || '')

    if (!razorpayPaymentId || !razorpaySubscriptionId || !razorpaySignature) {
      return NextResponse.json({ success: false, error: 'Missing Razorpay payment details' }, { status: 400 })
    }

    if (!verifyRazorpaySubscriptionSignature({
      paymentId: razorpayPaymentId,
      subscriptionId: razorpaySubscriptionId,
      signature: razorpaySignature
    })) {
      return NextResponse.json({ success: false, error: 'Invalid Razorpay signature' }, { status: 400 })
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
          setAll() {
            // Session is read-only in this route.
          },
        },
      }
    )

    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Please sign in before continuing' }, { status: 401 })
    }

    const supabase = getServiceSupabase()
    const { data: signup, error } = await supabase
      .from('onboarding_subscriptions')
      .select('*')
      .eq('razorpay_subscription_id', razorpaySubscriptionId)
      .single()

    if (error || !signup) {
      return NextResponse.json({ success: false, error: 'Subscription record not found' }, { status: 404 })
    }

    const notes = (signup.notes && typeof signup.notes === 'object' ? signup.notes : {}) as Record<string, unknown>
    const planName = typeof notes.plan_name === 'string' ? notes.plan_name : 'Onboarding Plan'
    const workspaceUrl =
      (typeof signup.workspace_backlink_url === 'string' && signup.workspace_backlink_url) ||
      (typeof notes.backlink_url === 'string' && notes.backlink_url) ||
      (typeof notes.workspace_url === 'string' && notes.workspace_url) ||
      signup.subdomain_url
    if (typeof notes.user_id === 'string' && notes.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'This purchase does not belong to your account' }, { status: 403 })
    }

    const updatedNotes: Record<string, unknown> = {
      ...notes,
      razorpay_payment_id: razorpayPaymentId,
      verified_at: new Date().toISOString(),
      confirmation_sent: true
    }

    const { data: updatedSignup, error: updateError } = await supabase
      .from('onboarding_subscriptions')
      .update({
        status: 'active',
        notes: updatedNotes
      })
      .eq('id', signup.id)
      .select('*')
      .single()

    if (updateError || !updatedSignup) {
      return NextResponse.json({ success: false, error: updateError?.message ?? 'Unable to activate subscription' }, { status: 500 })
    }

    await finalizeOnboardingCouponRedemption(updatedSignup)

    const profileResult = await upsertBusinessProfile(supabase, {
      userId: user.id,
      email: updatedSignup.email,
      fullName: updatedSignup.owner_name,
      status: 'active',
    })

    if (!profileResult.success) {
      return NextResponse.json(
        { success: false, error: profileResult.error.message || 'Unable to enable business access for this account' },
        { status: 500 }
      )
    }

    await sendOnboardingConfirmationEmail({
      to: updatedSignup.email,
      ownerName: updatedSignup.owner_name,
      companyName: updatedSignup.company_name,
      planName,
      billingCycle: updatedSignup.billing_cycle,
      amount: Number(updatedSignup.final_amount ?? updatedSignup.amount),
      dashboardUrl: '/business/dashboard?onboard=success',
      workspaceUrl
    })

    return NextResponse.json({
      success: true,
      dashboardUrl: '/business/dashboard?onboard=success',
      companyFallbackUrl: '/company',
      workspaceUrl,
      subdomainUrl: workspaceUrl
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    )
  }
}

