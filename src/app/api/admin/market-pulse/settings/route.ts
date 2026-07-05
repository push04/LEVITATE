import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('market_pulse_settings')
    .select('publish_mode, updated_at')
    .eq('id', true)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ publishMode: data?.publish_mode ?? 'manual', updatedAt: data?.updated_at ?? null })
}

export async function PUT(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const publishMode = body.publishMode

  if (publishMode !== 'auto' && publishMode !== 'manual') {
    return NextResponse.json({ error: 'publishMode must be "auto" or "manual"' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('market_pulse_settings')
    .upsert({ id: true, publish_mode: publishMode, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, publishMode })
}
