/**
 * Outreach Agent — Daily 9 AM IST
 * Sends hyper-personalized WhatsApp messages to hot leads.
 * Schedule: 3:30 AM UTC = 9:00 AM IST
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { sendWhatsApp } from '../../src/lib/whatsapp/client'
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
      .not('whatsapp', 'is', null)
      .order('score', { ascending: false })
      .limit(10)

    if (!hotLeads?.length) {
      console.log('[Outreach] No hot leads to contact today')
      return
    }

    let sent = 0

    for (const lead of hotLeads) {
      try {
        const message = await callAI(
          `You are Pushpal from Levitate Labs, a web developer from Vadodara, Gujarat.
Write a WhatsApp message to a local business owner.

RULES:
- Reference ONE specific thing about their type of business
- Point out ONE problem (no website = missing Google, JustDial, customers can't find them online)
- Offer to build a professional website in 5-7 days
- Sound like a real local person, NOT a corporate template
- Use Hinglish naturally (Hindi + English mix)
- Under 120 words TOTAL
- End with ONE easy yes/no question like "Interested?"
- Sign: "- Pushpal, Levitate Labs"
- NEVER mention AI, automation, or bot`,
          JSON.stringify({
            business_name: lead.business_name,
            owner_name: lead.owner_name ?? '',
            category: lead.category,
            city: lead.city,
            has_website: lead.has_website,
            source: lead.source
          }),
          300,
          'outreach'
        )

        if (!lead.whatsapp) continue

        const success = await sendWhatsApp(lead.whatsapp, message)

        if (success) {
          await supabase.from('leads').update({
            status: 'contacted',
            outreach_count: (lead.outreach_count ?? 0) + 1,
            last_outreach_at: new Date().toISOString()
          }).eq('id', lead.id)

          await supabase.from('messages').insert({
            lead_id: lead.id,
            direction: 'outbound',
            channel: 'whatsapp',
            content: message,
            sent_by_agent: 'outreach'
          })

          await supabase.rpc('update_agent_credits', { p_agent_name: 'outreach', p_amount: 5, p_reason: `Outreach to ${lead.business_name}` })
          sent++

          // Human-like delay 1-3 minutes between messages
          await sleep(Math.random() * 120000 + 60000)
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

    console.log(`[Outreach] Sent ${sent} messages`)
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
