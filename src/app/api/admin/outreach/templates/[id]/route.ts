import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await request.json()
  const supabase = getServiceSupabase()

  // If activating this template, deactivate all others first
  if (updates.is_active === true) {
    await supabase.from('outreach_templates').update({ is_active: false }).neq('id', params.id)
  }

  const { data, error } = await supabase
    .from('outreach_templates')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('outreach_templates').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
