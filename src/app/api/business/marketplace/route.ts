import { NextRequest, NextResponse } from 'next/server'
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'
import { createPaymentLink } from '@/lib/payments/razorpay'
import {
  computeMarketplaceQuote,
  extractMarketplaceDiscountPct,
  MARKETPLACE_LABELS,
  MARKETPLACE_OPTIONS,
  type MarketplaceOption,
} from '@/lib/marketplace-pricing'

export const dynamic = 'force-dynamic'

type ProductInput = {
  productName: string
  description?: string
  category?: string
  tags?: string[]
  imageUrls?: string[]
}

export async function GET() {
  let companyId: string
  let planId: string | null
  try {
    ({ companyId, portal: { planId } } = await requireBusinessCompany('marketplace'))
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const supabase = getServiceSupabase()

  let discountPct = 0
  if (planId) {
    const { data: planRow } = await supabase.from('onboarding_plans').select('feature_controls').eq('id', planId).maybeSingle()
    discountPct = extractMarketplaceDiscountPct(planRow?.feature_controls)
  }

  const { data: requests, error } = await supabase
    .from('marketplace_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const requestIds = (requests ?? []).map(r => r.id)
  const { data: products } = requestIds.length
    ? await supabase.from('marketplace_request_products').select('*').in('request_id', requestIds)
    : { data: [] }

  const productsByRequest = new Map<string, unknown[]>()
  for (const p of products ?? []) {
    const list = productsByRequest.get(p.request_id) ?? []
    list.push(p)
    productsByRequest.set(p.request_id, list)
  }

  const enriched = (requests ?? []).map(r => ({ ...r, products: productsByRequest.get(r.id) ?? [] }))

  return NextResponse.json({ requests: enriched, discountPct })
}

export async function POST(req: NextRequest) {
  let companyId: string
  let planId: string | null
  let accountEmail: string | null
  try {
    ({ companyId, portal: { planId }, accountEmail } = await requireBusinessCompany('marketplace'))
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const body = await req.json().catch(() => ({}))
  const marketplaces = (Array.isArray(body.marketplaces) ? body.marketplaces : []) as MarketplaceOption[]
  const addonPhotography = Boolean(body.addonPhotography)
  const addonTagging = Boolean(body.addonTagging)
  const products = (Array.isArray(body.products) ? body.products : []) as ProductInput[]

  const validMarketplaces = marketplaces.filter(m => MARKETPLACE_OPTIONS.includes(m))
  if (validMarketplaces.length === 0) {
    return NextResponse.json({ error: 'Select at least one marketplace' }, { status: 400 })
  }
  if (products.length === 0) {
    return NextResponse.json({ error: 'Add at least one product' }, { status: 400 })
  }
  for (const p of products) {
    if (!p.productName || !p.productName.trim()) {
      return NextResponse.json({ error: 'Every product needs a name' }, { status: 400 })
    }
  }

  const supabase = getServiceSupabase()

  let discountPct = 0
  if (planId) {
    const { data: planRow } = await supabase.from('onboarding_plans').select('feature_controls').eq('id', planId).maybeSingle()
    discountPct = extractMarketplaceDiscountPct(planRow?.feature_controls)
  }

  // Authoritative, server-computed price — never trust a client-supplied amount.
  const quote = computeMarketplaceQuote({
    productCount: products.length,
    marketplaceCount: validMarketplaces.length,
    addonPhotography,
    addonTagging,
    discountPct,
  })

  const [{ data: request, error: requestError }, { data: subscriptionRow }] = await Promise.all([
    supabase
      .from('marketplace_requests')
      .insert({
        company_id: companyId,
        marketplaces: validMarketplaces,
        addon_photography: addonPhotography,
        addon_tagging: addonTagging,
        product_count: products.length,
        subtotal_amount: quote.subtotal,
        discount_amount: quote.discountAmount,
        total_amount: quote.total,
        payment_status: 'pending_payment',
        status: 'submitted',
      })
      .select()
      .single(),
    // onboarding_subscriptions has no company_id column — that value only
    // lives in `notes` (see src/lib/company-email.ts for the same pattern).
    supabase
      .from('onboarding_subscriptions')
      .select('phone, company_name')
      .contains('notes', { company_id: companyId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (requestError || !request) {
    return NextResponse.json({ error: requestError?.message ?? 'Failed to create request' }, { status: 500 })
  }

  const productRows = products.map(p => ({
    request_id: request.id,
    company_id: companyId,
    product_name: p.productName.trim(),
    description: p.description?.trim() || null,
    category: p.category?.trim() || null,
    tags: Array.isArray(p.tags) ? p.tags.filter(Boolean) : [],
    image_urls: Array.isArray(p.imageUrls) ? p.imageUrls.filter(Boolean) : [],
    marketplace_status: Object.fromEntries(validMarketplaces.map(m => [m, 'pending'])),
  }))

  const { error: productsError } = await supabase.from('marketplace_request_products').insert(productRows)
  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 })
  }

  if (quote.total <= 0) {
    // Fully discounted / free request — no payment needed.
    await supabase.from('marketplace_requests').update({ payment_status: 'paid' }).eq('id', request.id)
    return NextResponse.json({ success: true, requestId: request.id, total: quote.total })
  }

  try {
    const marketplaceLabel = validMarketplaces.map(m => MARKETPLACE_LABELS[m]).join(', ')
    const link = await createPaymentLink({
      amount: quote.total,
      description: `Marketplace listing — ${products.length} product(s) on ${marketplaceLabel}`,
      name: subscriptionRow?.company_name ?? accountEmail ?? 'Business',
      contact: subscriptionRow?.phone ?? '',
      email: accountEmail ?? undefined,
      referenceId: `marketplace_${request.id}`,
    })

    await supabase
      .from('marketplace_requests')
      .update({ razorpay_payment_link_id: link.id, razorpay_payment_link_url: link.short_url })
      .eq('id', request.id)

    return NextResponse.json({ success: true, requestId: request.id, checkoutUrl: link.short_url, total: quote.total })
  } catch (err) {
    // Don't leave the request stuck in pending_payment forever with no way
    // forward — mark it failed so the business dashboard shows a clear state
    // instead of a dead "awaiting payment" entry with no link.
    const message = err instanceof Error ? err.message : 'Failed to create payment link'
    await supabase
      .from('marketplace_requests')
      .update({ payment_status: 'failed', admin_notes: `Payment link creation failed: ${message}` })
      .eq('id', request.id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
