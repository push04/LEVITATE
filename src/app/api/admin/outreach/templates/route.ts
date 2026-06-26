import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('outreach_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, subject, body, is_active } = await request.json()
  if (!name?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'name, subject, and body are required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // If this template is being set active, deactivate all others first
  if (is_active) {
    await supabase.from('outreach_templates').update({ is_active: false }).eq('is_active', true)
  }

  const { data, error } = await supabase
    .from('outreach_templates')
    .insert({ name: name.trim(), subject: subject.trim(), body: body.trim(), is_active: !!is_active })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
