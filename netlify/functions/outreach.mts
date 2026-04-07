/**
 * Outreach Agent — Daily 9 AM IST
 * Sends personalized cold emails to hot leads.
 * Schedule: 3:30 AM UTC = 9:00 AM IST
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { sendLeadEmail, notifyFounder } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export default async () => {
  const supabase = getServiceSupabase()

  try {
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'new')
      .gte('score', 6)
      .is('last_outreach_at', null)
      .not('email', 'is', null)
      .order('score', { ascending: false })
      .limit(10)

    if (!hotLeads?.length) {
      console.log('[Outreach] No hot leads to contact today')
      return
    }

    let sent = 0

    for (const lead of hotLeads) {
      try {
        const body = await callAI(
          `You are Pushpal from Levitate Labs, a web developer from Vadodara, Gujarat.
Write a cold email to a local business owner.

RULES:
- Subject line should be natural, NOT spammy
- Reference ONE specific thing about their type of business
- Point out ONE problem (no website = missing Google, customers can't find them online)
- Offer to build a professional website in 5-7 days
- Sound like a real local person, NOT a corporate template
- Mix English with some Hinglish naturally
- Under 150 words TOTAL for body
- End with ONE easy yes/no question like "Would you like a free mockup?"
- Sign: "Pushpal\nLevitate Labs\nlevitatelabs.online\n+91-XXXXXXXXXX"
- Return JSON: {"subject": "...", "body": "..."}
- NEVER mention AI, automation, or bot`,
          JSON.stringify({
            business_name: lead.business_name,
            owner_name: lead.owner_name ?? '',
            category: lead.category,
            city: lead.city,
            has_website: lead.has_website,
            source: lead.source
          }),
          400,
          'outreach'
        )

        let subject = `Website for ${lead.business_name}?`
        let emailBody = body

        try {
          const parsed = JSON.parse(body)
          subject = parsed.subject ?? subject
          emailBody = parsed.body ?? body
        } catch {
          // use raw body if not JSON
        }

        if (!lead.email) continue

        const success = await sendLeadEmail(lead.email, subject, emailBody)

        if (success) {
          await supabase.from('leads').update({
            status: 'contacted',
            outreach_count: (lead.outreach_count ?? 0) + 1,
            last_outreach_at: new Date().toISOString()
          }).eq('id', lead.id)

          await supabase.from('messages').insert({
            lead_id: lead.id,
            direction: 'outbound',
            channel: 'email',
            content: `Subject: ${subject}\n\n${emailBody}`,
            sent_by_agent: 'outreach'
          })

          await supabase.rpc('update_agent_credits', { p_agent_name: 'outreach', p_amount: 5, p_reason: `Outreach to ${lead.business_name}` })
          sent++

          // Polite delay between emails (30-90 seconds)
          await sleep(Math.random() * 60000 + 30000)
        }
      } catch (err) {
        console.error(`[Outreach] Failed for ${lead.business_name}:`, err)
      }
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'outreach',
      action: 'daily_outreach',
      input: { candidates: hotLeads.length },
      output: { sent },
      status: 'success',
      credits_earned: sent * 5
    })

    console.log(`[Outreach] Sent ${sent} emails`)
  } catch (err) {
    console.error('[Outreach] Failed:', err)
    await supabase.from('agent_logs').insert({
      agent_name: 'outreach',
      action: 'daily_outreach',
      input: {},
      output: { error: String(err) },
      status: 'failure',
      credits_earned: -10
    })
  }
}

export const config: Config = {
  schedule: '30 3 * * *' // 9:00 AM IST
}
