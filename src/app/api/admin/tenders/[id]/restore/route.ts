import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('tenders').update({ is_hidden: false }).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
