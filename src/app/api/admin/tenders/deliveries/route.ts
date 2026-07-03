import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
