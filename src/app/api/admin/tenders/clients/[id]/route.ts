import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of [
    'company_name', 'contact_name', 'email', 'phone_number', 'districts', 'categories',
    'keywords', 'min_value', 'max_value', 'delivery_frequency', 'is_active', 'notes',
  ]) {
    if (key in body) patch[key] = body[key]
  }

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('tender_clients').update(patch).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('tender_clients').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
