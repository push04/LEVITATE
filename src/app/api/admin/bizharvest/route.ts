import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { getBizharvestAnalytics } from '@/lib/bizharvest-analytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceSupabase()
    const analytics = await getBizharvestAnalytics(supabase)
    return NextResponse.json(analytics)
  } catch (err: any) {
    console.error('[bizharvest] unhandled error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
