import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('tender_clients').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (!body.company_name || !body.email) {
    return NextResponse.json({ error: 'company_name and email are required' }, { status: 400 })
  }

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('tender_clients')
      .insert({
        company_name: body.company_name,
        contact_name: body.contact_name || null,
        email: body.email,
        phone_number: body.phone_number || null,
        districts: body.districts || [],
        categories: body.categories || [],
        keywords: body.keywords || [],
        min_value: body.min_value ?? null,
        max_value: body.max_value ?? null,
        delivery_frequency: body.delivery_frequency || 'daily',
        is_active: body.is_active ?? true,
        notes: body.notes || null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
