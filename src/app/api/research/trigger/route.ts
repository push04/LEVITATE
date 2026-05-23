import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST() {
  const supabase = getServiceSupabase()

  try {
    const { data: unscoredLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'New')
      .is('deal_value', null)
      .limit(5)

    let enriched = 0
    for (const lead of unscoredLeads ?? []) {
      try {
        const research = await callAI(
          `You are a market research analyst. Research this lead and return JSON with:
- estimated_value: conservative INR estimate for a professional website
- priority_score: 1-10 how urgent they need a website
- industry_trends: 2-3 brief trends
- recommendations: what their website should have`,
          JSON.stringify({ business_name: lead.name, category: lead.service_category, city: lead.city }),
          500,
          'research'
        )

        let parsed: { priority_score: number; estimated_value: number; industry_trends?: unknown[] } = { priority_score: 5, estimated_value: 15000 }
        try { parsed = JSON.parse(research) } catch { }

        await supabase.from('leads').update({
          deal_value: parsed.estimated_value ?? 15000,
          notes: `Priority: ${parsed.priority_score}/10. Trends: ${JSON.stringify(parsed.industry_trends ?? [])}`
        }).eq('id', lead.id)

        await supabase.from('agent_logs').insert({
          agent_name: 'research',
          action: 'manual_research',
          input: { lead_id: lead.id },
          output: { enriched: true, score: parsed.priority_score },
          status: 'success',
          credits_earned: 3
        })
        enriched++
      } catch (err) {
        console.error(`[Research] Failed for ${lead.name}:`, err)
      }
    }

    return NextResponse.json({ success: true, enriched, total: unscoredLeads?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
