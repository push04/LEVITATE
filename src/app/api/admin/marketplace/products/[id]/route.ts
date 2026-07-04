import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { MARKETPLACE_OPTIONS } from '@/lib/marketplace-pricing'

const ALLOWED_PRODUCT_STATUS = ['pending', 'in_progress', 'listed', 'rejected']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const marketplace = String(body.marketplace || '')
  const status = String(body.status || '')

  if (!MARKETPLACE_OPTIONS.includes(marketplace as typeof MARKETPLACE_OPTIONS[number])) {
    return NextResponse.json({ error: 'Invalid marketplace' }, { status: 400 })
  }
  if (!ALLOWED_PRODUCT_STATUS.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data: product, error: fetchError } = await supabase
    .from('marketplace_request_products')
    .select('marketplace_status')
    .eq('id', id)
    .single()

  if (fetchError || !product) {
    return NextResponse.json({ error: fetchError?.message ?? 'Product not found' }, { status: 404 })
  }

  const nextStatus = { ...(product.marketplace_status as Record<string, string> ?? {}), [marketplace]: status }
  const { error: updateError } = await supabase
    .from('marketplace_request_products')
    .update({ marketplace_status: nextStatus })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true, marketplace_status: nextStatus })
}
