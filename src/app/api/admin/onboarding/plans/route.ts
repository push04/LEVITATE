import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { createRazorpayPlan } from '@/lib/payments/razorpay-subscriptions'
import { DEFAULT_PLAN_FEATURE_ACCESS, normalizeFeatureAccess } from '@/lib/business-intelligence'

export const dynamic = 'force-dynamic'

function normalizeList(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value.split('\n').map(item => item.trim()).filter(Boolean)
    }
  }
  return []
}

export async function GET() {
  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('onboarding_plans').select('*').order('sort_order', { ascending: true })
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load plans' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = getServiceSupabase()
    const planPayload = {
      slug: body.slug,
      name: body.name,
      tagline: body.tagline ?? '',
      description: body.description ?? '',
      monthly_price: Number(body.monthly_price ?? 0),
      annual_price: Number(body.annual_price ?? 0),
      monthly_setup_fee: Number(body.monthly_setup_fee ?? 0),
      annual_setup_fee: Number(body.annual_setup_fee ?? 0),
      features: normalizeList(body.features),
      highlights: normalizeList(body.highlights),
      deliverables: normalizeList(body.deliverables),
      is_featured: Boolean(body.is_featured),
      is_active: body.is_active !== false,
      sort_order: Number(body.sort_order ?? 0),
      cta_label: body.cta_label ?? 'Start onboarding',
      support_level: body.support_level ?? 'Standard support',
      feature_controls: normalizeFeatureAccess(body.feature_controls ?? DEFAULT_PLAN_FEATURE_ACCESS)
    }

    const { data: created, error } = await supabase.from('onboarding_plans').insert(planPayload).select().single()
    if (error) throw error

    if (body.sync_razorpay !== false) {
      const [monthly, annual] = await Promise.all([
        createRazorpayPlan({
          name: `${created.name} - monthly`,
          amountInRupees: created.monthly_price,
          period: 'monthly',
          description: created.description
        }).catch(() => null),
        createRazorpayPlan({
          name: `${created.name} - annual`,
          amountInRupees: created.annual_price,
          period: 'yearly',
          description: created.description
        }).catch(() => null)
      ])

      const updates: Record<string, unknown> = {}
      if (monthly?.id) updates.monthly_razorpay_plan_id = monthly.id
      if (annual?.id) updates.annual_razorpay_plan_id = annual.id
      if (Object.keys(updates).length) {
        await supabase.from('onboarding_plans').update(updates).eq('id', created.id)
      }
    }

    return NextResponse.json({ success: true, data: created })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to save plan' },
      { status: 500 }
    )
  }
}
