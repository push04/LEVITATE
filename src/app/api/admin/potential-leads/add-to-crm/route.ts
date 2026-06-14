import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data: lead } = await supabase.from('potential_leads').select('*').eq('id', id).single()
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Insert into leads (CRM) table
  const { error } = await supabase.from('leads').insert({
    business_name: lead.business_name,
    phone: lead.phone,
    city: lead.city,
    service_category: lead.category,
    website_link: lead.website,
    source: 'ai_scrape',
    status: 'New',
    score: lead.ai_score,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('potential_leads').update({ status: 'converted' }).eq('id', id)

  return NextResponse.json({ ok: true })
}
