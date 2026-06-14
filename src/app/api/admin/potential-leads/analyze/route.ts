import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { callAI } from '@/lib/ai/router'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids?: string[] }
  if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data: leads, error } = await supabase
    .from('potential_leads')
    .select('id, business_name, city, category, phone, website')
    .in('id', ids.slice(0, 20))

  if (error || !leads?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prompt = leads.map((l, i) =>
    `${i + 1}. "${l.business_name}" | ${l.city} | ${l.category}${l.phone ? ' | has phone' : ''}${l.website ? ' | has website' : ''}`
  ).join('\n')

  let scores: number[] = leads.map(() => 5)
  try {
    const raw = await callAI(
      `You are a lead quality checker for Indian SMB data.
Rate each business 1-10 on how likely it is to be a real local Indian business matching its city and category.
1-3 = Junk (URL, foreign company, generic word, government body, news headline, programming term)
4-6 = Uncertain (might be real but low quality data)
7-10 = Clearly a real Indian business name matching the category

Reply ONLY with a JSON array of ${leads.length} integers, e.g. [8,2,9,5]`,
      prompt,
      120,
      'lead-quality'
    )
    const parsed = JSON.parse(raw.replace(/```json?|```/g, '').trim()) as number[]
    if (Array.isArray(parsed) && parsed.length === leads.length) {
      scores = parsed.map(s => Math.max(1, Math.min(10, Math.round(s))))
    }
  } catch { /* keep defaults */ }

  // Update scores in DB
  const updates = leads.map((l, i) =>
    supabase.from('potential_leads').update({ ai_score: scores[i] }).eq('id', l.id)
  )
  await Promise.allSettled(updates)

  return NextResponse.json({
    analyzed: leads.length,
    scores: leads.map((l, i) => ({ id: l.id, name: l.business_name, score: scores[i] })),
  })
}
