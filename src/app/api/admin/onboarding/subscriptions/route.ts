import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('onboarding_subscriptions')
      .select('*, onboarding_plans(name, slug)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  const supabase = getServiceSupabase()
  const { data, error } = await supabase.from('onboarding_subscriptions').update({ status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
