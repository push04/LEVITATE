/**
 * GET  /api/v1/scrape-targets   — returns active {city, business_type} pairs for BizHarvest
 * POST /api/v1/scrape-targets   — add a new target
 * DELETE /api/v1/scrape-targets — remove a target by id
 *
 * Auth: x-api-key header must match BIZHARVEST_API_KEY env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function authOk(req: NextRequest): boolean {
  const key = process.env.BIZHARVEST_API_KEY
  if (!key) return false
  return req.headers.get('x-api-key') === key
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('bizharvest_targets')
    .select('id, city, business_type, priority')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ targets: data ?? [], count: (data ?? []).length })
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { city?: string; business_type?: string; priority?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { city, business_type, priority = 0 } = body
  if (!city || !business_type) {
    return NextResponse.json({ error: 'city and business_type are required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('bizharvest_targets')
    .insert({ city: city.trim(), business_type: business_type.trim(), priority, is_active: true })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ target: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('bizharvest_targets').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
