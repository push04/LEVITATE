import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

const ALLOWED_STATUS = ['submitted', 'in_progress', 'completed', 'rejected']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }
  if (typeof body.adminNotes === 'string') {
    update.admin_notes = body.adminNotes
  }

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('marketplace_requests').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
