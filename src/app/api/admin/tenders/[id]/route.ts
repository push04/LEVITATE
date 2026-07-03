import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (typeof body.category === 'string') patch.category = body.category
  if (typeof body.notes === 'string') patch.notes = body.notes
  if (Array.isArray(body.tags)) patch.tags = body.tags

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('tenders').update(patch).eq('id', id).select().single()
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
    const { error } = await supabase.from('tenders').update({ is_hidden: true }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
