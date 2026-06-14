/**
 * Tasks API — task queue management
 */

import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'


export async function GET(req: Request) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'all'

  try {
    let query = supabase.from('tasks').select('*, projects(name), leads(business_name)').order('created_at', { ascending: false }).limit(100)
    if (status !== 'all') query = query.eq('status', status)

    const { data } = await query
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}


export async function POST(req: Request) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { action, taskId } = await req.json()

  try {
    if (action === 'retry') {
      await supabase.from('tasks').update({
        status: 'pending',
        assigned_agent: null,
        claimed_at: null,
        scheduled_for: new Date().toISOString()
      }).eq('id', taskId)
    } else if (action === 'resolve') {
      await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', taskId)
    } else if (action === 'skip') {
      await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString(), result: { skipped: true } }).eq('id', taskId)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

