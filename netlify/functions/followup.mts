/**
 * Follow-Up Agent — Daily 10 AM IST
 * Day 3: 2nd message with different angle
 * Day 7: Final message — then archive
 * Schedule: 4:30 AM UTC = 10:00 AM IST
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { sendWhatsApp } from '../../src/lib/whatsapp/client'
import { getServiceSupabase } from '../../src/lib/supabase'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export default async () => {
  const supabase = getServiceSupabase()

  try {
    const { data: contactedLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'contacted')
      .not('last_outreach_at', 'is', null)
      .lte('outreach_count', 2)
      .not('whatsapp', 'is', null)

    let followedUp = 0

    for (const lead of contactedLeads ?? []) {
      const days = daysSince(lead.last_outreach_at)
      if (lead.outreach_count === 1 && days >= 3) {
        // Day 3 follow-up
        const message = await callAI(
          `You are Pushpal from Levitate Labs. Write a follow-up WhatsApp (2nd contact).
Previous message was about building a website for their business.
Try a different angle this time — offer something valuable like a free website audit or show a quick example.
Keep it under 80 words. Hinglish. Friendly, not pushy.
Sign: "- Pushpal"`,
          JSON.stringify({ business_name: lead.business_name, category: lead.category, city: lead.city }),
          200,
          'followup'
        )

        if (await sendWhatsApp(lead.whatsapp!, message)) {
          await supabase.from('leads').update({
            outreach_count: 2,
            last_outreach_at: new Date().toISOString()
          }).eq('id', lead.id)
          await supabase.from('messages').insert({ lead_id: lead.id, direction: 'outbound', channel: 'whatsapp', content: message, sent_by_agent: 'followup' })
          followedUp++
          await sleep(30000)
        }
      } else if (lead.outreach_count === 2 && days >= 7) {
        // Day 7 — final message, then archive
        const message = await callAI(
          `You are Pushpal from Levitate Labs. Write a FINAL WhatsApp message (3rd and last contact).
Make it about a time-sensitive offer or completely different value prop.
Keep it under 60 words. Light, easy, no pressure.
End with: "No worries if not — good luck with the business! 🙏"
Sign: "- Pushpal"`,
          JSON.stringify({ business_name: lead.business_name, category: lead.category }),
          150,
          'followup'
        )

        if (await sendWhatsApp(lead.whatsapp!, message)) {
          await supabase.from('leads').update({
            outreach_count: 3,
            last_outreach_at: new Date().toISOString(),
            status: 'archived'
          }).eq('id', lead.id)
          await supabase.from('messages').insert({ lead_id: lead.id, direction: 'outbound', channel: 'whatsapp', content: message, sent_by_agent: 'followup' })
          followedUp++
          await sleep(30000)
        }
      }
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'followup',
      action: 'daily_followup',
      input: { candidates: contactedLeads?.length ?? 0 },
      output: { followed_up: followedUp },
      status: 'success',
      credits_earned: followedUp * 2
    })

    console.log(`[FollowUp] Sent ${followedUp} follow-ups`)
  } catch (err) {
    console.error('[FollowUp] Failed:', err)
  }
}

export const config: Config = {
  schedule: '30 4 * * *' // 10:00 AM IST
}
