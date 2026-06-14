import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { sendLeadEmail } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function logEmail(
  supabase: ReturnType<typeof getServiceSupabase>,
  opts: {
    leadId: string
    agentName: string
    toEmail: string
    subject: string
    body: string
  }
) {
  try {
    await supabase.from('agent_emails').insert({
      lead_id: opts.leadId,
      agent_name: opts.agentName,
      direction: 'outbound',
      to_email: opts.toEmail,
      from_email: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'agent@levitatelabs.online',
      subject: opts.subject,
      body: opts.body,
      status: 'sent'
    })
  } catch (e) {
    console.error('[logEmail]', e)
  }
}

async function followupHandler() {
  const supabase = getServiceSupabase()

  try {
    const { data: contactedLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'Contacted')
      .not('last_outreach_at', 'is', null)
      .lte('outreach_count', 2)
      .not('email', 'is', null)
      .neq('email', '')
      .eq('source', 'bizdev_agent')
      .limit(2)

    let followedUp = 0

    for (const lead of contactedLeads ?? []) {
      const days = daysSince(lead.last_outreach_at)

      if (lead.outreach_count === 1 && days >= 3) {
        const body = await callAI(
          `You are Rahul Desai, Client Relations at Levitate Labs from Vadodara.
Write a casual follow-up email (2nd contact).
Previous email was about building a website for their business.

RULES:
- NO em dashes or fancy punctuation
- Keep it under 80 words
- Try a different angle - offer something free and easy
- Maybe share a simple example of a website you made
- Be friendly, not pushy at all
- Sound like a real person following up with a friend
- End with something like "Would love to help if you are interested"
- Sign: "Thanks, Rahul Desai | Client Relations"
- Phone: +91-6299549112
- Return JSON: {"subject": "simple subject", "body": "email text"}
- NEVER mention AI, bot, or agency`,
          JSON.stringify({ business_name: lead.name, category: lead.service_category, city: lead.city }),
          250,
          'followup'
        )

        let subject = `Following up on my earlier message - ${lead.name}`
        let emailBody = body
        try {
          const p = JSON.parse(body)
          subject = p.subject ?? subject
          emailBody = p.body ?? body
        } catch {}

        emailBody = emailBody.replace(/---/g, '-').replace(/--/g, '-')
        subject = subject.replace(/---/g, '-').replace(/--/g, '-')

        if (await sendLeadEmail(lead.email, subject, emailBody)) {
          await supabase.from('leads').update({
            outreach_count: 2,
            last_outreach_at: new Date().toISOString()
          }).eq('id', lead.id)
          await logEmail(supabase, { leadId: lead.id, agentName: 'followup', toEmail: lead.email, subject, body: emailBody })
          followedUp++
        }

      } else if (lead.outreach_count === 2 && days >= 7) {
        const body = await callAI(
          `You are Rahul Desai, Client Relations at Levitate Labs from Vadodara.
Write a FINAL follow-up email (3rd and last contact).

RULES:
- NO em dashes or fancy punctuation
- Keep it under 100 words
- Make it light and easy - no pressure at all
- Maybe mention a special offer but keep it casual
- End with something like "No worries at all if you are not interested, wish you all the best with your business"
- Sign: "Thanks, Rahul Desai | Client Relations"
- Phone: +91-6299549112
- Return JSON: {"subject": "simple subject", "body": "email text"}
- NEVER mention AI, bot, or agency`,
          JSON.stringify({ business_name: lead.name, category: lead.service_category }),
          200,
          'followup'
        )

        let subject = `One last try - ${lead.name}`
        let emailBody = body
        try {
          const p = JSON.parse(body)
          subject = p.subject ?? subject
          emailBody = p.body ?? body
        } catch {}

        emailBody = emailBody.replace(/---/g, '-').replace(/--/g, '-')
        subject = subject.replace(/---/g, '-').replace(/--/g, '-')

        if (await sendLeadEmail(lead.email!, subject, emailBody)) {
          await supabase.from('leads').update({
            outreach_count: 3,
            last_outreach_at: new Date().toISOString(),
            status: 'Closed',
            closed_reason: 'No response after 3 outreach attempts (Day 1, Day 3, Day 7). Archived by followup agent.',
            revenue_generated: 0
          }).eq('id', lead.id)
          await logEmail(supabase, { leadId: lead.id, agentName: 'followup', toEmail: lead.email!, subject, body: emailBody })
          await supabase.from('agent_logs').insert({
            agent_name: 'followup',
            action: 'deal_closed_no_response',
            input: { lead_id: lead.id, lead_name: lead.name },
            output: { reason: 'No response after 3 emails', revenue: 0, status: 'Closed' },
            status: 'success',
            credits_earned: -2
          })
          followedUp++
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

    console.log(`[FollowUp] Sent ${followedUp} follow-up emails`)
  } catch (err) {
    console.error('[FollowUp] Failed:', err)
  }
}

export default followupHandler

export const config: Config = {
  schedule: '*/15 * * * *'
}
