/**
 * Research Agent — Every 15 minutes
 * 1. Enriches unscored automation leads (sets ai_score + ai_analysis)
 * 2. Extracts email from business websites (unlocks outreach pipeline)
 * NOTE: Market research emails moved to market-tracker.mts (every 6 hours)
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

// ─── Email extraction from business website ──────────────────────────────────

async function extractEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  if (!websiteUrl) return null
  const base = websiteUrl.replace(/\/$/, '').replace(/^http:/, 'https:')
  const pagesToTry = [`${base}/contact`, `${base}/contact-us`, `${base}/about`, base]

  for (const url of pagesToTry) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) continue
      const html = await res.text()

      // Find email — skip generic/noreply addresses
      const match = html.match(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      )
      if (!match) continue

      const email = match.find(e =>
        !e.match(/example|noreply|no-reply|support@sentry|@w3|@schema|@domain|\.png|\.jpg/i)
      )
      if (email) return email.toLowerCase().trim()
    } catch { /* try next page */ }
  }
  return null
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default async () => {
  const supabase = getServiceSupabase()

  try {
    // ── Step 1: Enrich unscored automation leads ──────────────────────────────
    const { data: unscoredLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'New')
      .is('ai_score', null)          // FIXED: was 'score' (column doesn't exist)
      .eq('source', 'bizdev_agent')  // only enrich automation leads
      .limit(5)

    let enriched = 0

    for (const lead of unscoredLeads ?? []) {
      try {
        const research = await callAI(
          `You are a market research analyst for a web development agency in India.
Research and enrich this lead. Return JSON with:
- priority_score: 1-10, how urgently do they need a website (10 = desperately needs one)
- estimated_project_value: conservative estimate in INR for a basic website
- website_recommendations: 2-3 key things their website should have
- tags: array of 3-5 relevant tags
- deduced_email: A highly probable email address for them (e.g. businessname@gmail.com if they have no website, or info@theirwebsite.com). Null if impossible to guess.

Reply with valid JSON only.`,
          JSON.stringify({
            business_name: lead.name,               // FIXED: was lead.business_name
            category:      lead.service_category,   // FIXED: was lead.category
            city:          lead.city,
            has_website:   lead.has_website
          }),
          400,
          'research'
        )

        let parsed: any = { priority_score: 6, estimated_project_value: 15000, website_recommendations: [], tags: [], deduced_email: null }
        try { parsed = JSON.parse(research) } catch { /* use defaults */ }

        await supabase.from('leads').update({
          ai_score:    parsed.priority_score ?? 6,     // FIXED: was 'score'
          ai_analysis: research,                        // FIXED: was 'enriched_data' (doesn't exist)
          ...(parsed.deduced_email && !lead.email ? { email: parsed.deduced_email } : {}),
          source_data: {
            ...(lead.source_data ?? {}),
            research_enriched:  true,
            estimated_value:    parsed.estimated_project_value,
            tags:               parsed.tags,
            website_recs:       parsed.website_recommendations
          }
        }).eq('id', lead.id)

        await supabase.rpc('update_agent_credits', {
          p_agent_name: 'research',
          p_amount:     3,
          p_reason:     `Enriched ${lead.name}`
        })
        enriched++
      } catch (err) {
        console.error(`[Research] Enrichment failed for ${lead.name}:`, err)
      }
    }

    // ── Step 2: Extract emails from business websites ─────────────────────────
    // Finds bizdev leads that have a website but no email — extracts email so
    // the outreach agent can contact them.
    const { data: websiteLeads } = await supabase
      .from('leads')
      .select('id, name, website_link')
      .eq('source', 'bizdev_agent')
      .is('email', null)
      .not('website_link', 'is', null)
      .eq('status', 'New')
      .limit(5)

    let emailsFound = 0

    for (const lead of websiteLeads ?? []) {
      try {
        const email = await extractEmailFromWebsite(lead.website_link!)
        if (email) {
          await supabase.from('leads').update({ email }).eq('id', lead.id)
          console.log(`[Research] Found email for ${lead.name}: ${email}`)
          emailsFound++
        }
      } catch (err) {
        console.error(`[Research] Email extraction failed for ${lead.name}:`, err)
      }
    }

    // ── Final log ─────────────────────────────────────────────────────────────
    await supabase.from('agent_logs').insert({
      agent_name:    'research',
      action:        'market_research',
      input:         { unscored_candidates: unscoredLeads?.length ?? 0, website_candidates: websiteLeads?.length ?? 0 },
      output:        { enriched, emails_found: emailsFound },
      status:        'success',
      credits_earned: enriched * 3
    })

    console.log(`[Research] Enriched ${enriched} leads, found ${emailsFound} emails`)

  } catch (err) {
    console.error('[Research] Failed:', err)
    await supabase.from('agent_logs').insert({
      agent_name:    'research',
      action:        'market_research',
      input:         {},
      output:        { error: String(err) },
      status:        'failure',
      credits_earned: -5
    }).catch(() => {})
  }
}

export const config: Config = {
  schedule: '*/15 * * * *'
}
