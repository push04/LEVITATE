/**
 * BizDev Agent — Daily 6 AM IST
 * Scans Google Maps + JustDial for businesses without websites.
 * Scores them 1-10. Saves hot leads (≥6) to Supabase.
 * Schedule: 12:30 AM UTC = 6:00 AM IST
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { scrapeGoogleMaps, scrapeJustDial, type RawLead } from '../../src/lib/scrapers/google-maps'
import { getServiceSupabase } from '../../src/lib/supabase'

async function getTodayLeadCount(supabase: ReturnType<typeof getServiceSupabase>): Promise<number> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()).eq('source', 'bizdev_agent')
  return count ?? 0
}

async function scoreLead(lead: RawLead): Promise<number> {
  let score = 0
  if (!lead.has_website) score += 4
  if (lead.phone) score += 1
  if (['restaurant', 'food', 'point_of_interest', 'clinic', 'doctor', 'coaching', 'school'].some(t => lead.category?.includes(t))) score += 1
  score += lead.score_bonus ?? 0

  if (score >= 4) {
    try {
      const aiScore = await callAI(
        'Score this business lead 1-10 for needing a website. 10 = desperately needs one. Return ONLY a single integer, nothing else.',
        JSON.stringify({ business_name: lead.business_name, category: lead.category, has_website: lead.has_website, city: lead.city }),
        50,
        'bizdev'
      )
      const parsed = parseInt(aiScore.trim())
      if (!isNaN(parsed)) score = Math.round((score + parsed) / 2)
    } catch { /* use rule-based score */ }
  }

  return Math.min(10, Math.max(1, score))
}

export default async () => {
  const supabase = getServiceSupabase()

  try {
    const config = await supabase.from('system_config').select('value').eq('key', 'outreach_limits').single()
    const limits = config.data?.value ?? { daily_max: 20 }

    const todayCount = await getTodayLeadCount(supabase)
    if (todayCount >= limits.daily_max) {
      console.log('[BizDev] Daily limit reached:', todayCount)
      return
    }

    const targets = [
      'restaurant Vadodara no website',
      'coaching centre Vadodara',
      'clinic Vadodara no website',
      'salon Vadodara no website',
      'restaurant Surat no website',
      'coaching Surat',
      'clinic Ahmedabad',
      'boutique Vadodara no website'
    ]

    const [mapLeads, justDialLeads] = await Promise.all([
      scrapeGoogleMaps(targets),
      scrapeJustDial('Vadodara', ['Food', 'Education', 'Health', 'Beauty']).catch(() => [] as RawLead[])
    ])

    const allLeads = [...mapLeads, ...justDialLeads]
    let saved = 0

    for (const lead of allLeads) {
      if (saved + todayCount >= limits.daily_max) break

      const score = await scoreLead(lead)
      if (score < 6) continue

      // Check if already exists
      const { data: existing } = await supabase.from('leads').select('id').ilike('business_name', lead.business_name).limit(1)
      if (existing?.length) continue

      await supabase.from('leads').insert({
        business_name: lead.business_name,
        phone: lead.phone,
        whatsapp: lead.phone,
        city: lead.city ?? 'Vadodara',
        category: lead.category,
        google_maps_url: lead.google_maps_url,
        has_website: lead.has_website,
        current_website: lead.current_website,
        score,
        source: 'bizdev_agent',
        source_url: lead.source_url,
        source_data: lead.source_data,
        status: 'new',
        assigned_agent: 'outreach'
      })

      await supabase.rpc('update_agent_credits', { p_agent_name: 'bizdev', p_amount: 5, p_reason: `Found ${lead.business_name}` })
      saved++
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'bizdev',
      action: 'daily_scan',
      input: { queries: targets.length },
      output: { found: allLeads.length, saved },
      status: 'success',
      credits_earned: saved * 5
    })

    console.log(`[BizDev] Found ${allLeads.length} leads, saved ${saved} hot leads`)
  } catch (err) {
    console.error('[BizDev] Failed:', err)
    await supabase.from('agent_logs').insert({
      agent_name: 'bizdev',
      action: 'daily_scan',
      input: {},
      output: { error: String(err) },
      status: 'failure',
      credits_earned: -10
    })
  }
}

export const config: Config = {
  schedule: '30 0 * * *' // 6:00 AM IST
}
