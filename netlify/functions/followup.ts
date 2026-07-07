import type { Config } from '@netlify/functions'
import { sendLeadEmail } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// Fixed templates only — no per-lead AI generation (see outreach.ts for why:
// the AI-JSON parsing failure mode was confirmed sending literal
// {"subject": "...", "body": "..."} text to real leads in ~41% of sends).
function fillTemplate(template: string, lead: { name?: string; service_category?: string; city?: string }): string {
  const vars: Record<string, string> = {
    business_name: lead.name ?? 'your business',
    category: lead.service_category ?? 'business',
    city: lead.city ?? 'your city',
  }
  return template.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`)
}

const DAY3_FOLLOWUP_SUBJECT = 'Following up on my earlier message - {business_name}'
const DAY3_FOLLOWUP_BODY = `Hi {business_name},

Following up on my note a few days ago about AI automation for {category} businesses. Just to share a quick example, a clinic we worked with now handles 40 appointment bookings a day with zero staff involved.

Would it be worth a quick chat to see if something similar could help you?

Pushpal Sanyal
Levitate Labs
levitatelabs.online`

const FINAL_FOLLOWUP_SUBJECT = 'One last try - {business_name}'
const FINAL_FOLLOWUP_BODY = `Hi {business_name},

This will be my last note on this. We help businesses automate repetitive work like follow-ups, inquiries, and bookings using AI, and I thought it might be useful for {category} businesses like yours.

No pressure at all. If the timing is ever right, feel free to reach out.

Pushpal Sanyal
Levitate Labs
levitatelabs.online`

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

    for (const [i, lead] of (contactedLeads ?? []).entries()) {
      // Random pacing between sends within a run - never fire multiple
      // leads back-to-back with zero gap (looks bot-like to spam filters).
      // Kept well inside Netlify's ~10s function budget.
      if (i > 0) await sleep(1000 + Math.random() * 2000)

      const days = daysSince(lead.last_outreach_at)

      if (lead.outreach_count === 1 && days >= 3) {
        const subject = fillTemplate(DAY3_FOLLOWUP_SUBJECT, lead)
        const emailBody = fillTemplate(DAY3_FOLLOWUP_BODY, lead)

        if (await sendLeadEmail(lead.email, subject, emailBody)) {
          await supabase.from('leads').update({
            outreach_count: 2,
            last_outreach_at: new Date().toISOString()
          }).eq('id', lead.id)
          await logEmail(supabase, { leadId: lead.id, agentName: 'followup', toEmail: lead.email, subject, body: emailBody })
          followedUp++
        }

      } else if (lead.outreach_count === 2 && days >= 7) {
        const subject = fillTemplate(FINAL_FOLLOWUP_SUBJECT, lead)
        const emailBody = fillTemplate(FINAL_FOLLOWUP_BODY, lead)

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
