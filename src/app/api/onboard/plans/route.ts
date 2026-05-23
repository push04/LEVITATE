import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { DEFAULT_ONBOARDING_CONTENT, parseContent } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getServiceSupabase()
    const [plansRes, settingsRes] = await Promise.all([
      supabase.from('onboarding_plans').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('settings').select('value').eq('key', 'onboarding_page_content').maybeSingle()
    ])

    const content = parseContent(settingsRes.data?.value ?? DEFAULT_ONBOARDING_CONTENT)

    return NextResponse.json({
      success: true,
      plans: plansRes.data ?? [],
      content
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
