import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { sendLeadEmail } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

async function logEmail(
  supabase: ReturnType<typeof getServiceSupabase>,
  opts: {
    leadId: string
    agentName: string
    toEmail: string
    subject: string
    body: string
    status?: string
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
      status: opts.status ?? 'sent'
    })
  } catch (e) {
    console.error('[logEmail]', e)
  }
}

async function outreachHandler() {
  const supabase = getServiceSupabase()

  try {
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'New')
      .is('last_outreach_at', null)
      .not('email', 'is', null)
      .neq('email', '')
      .eq('source', 'bizdev_agent')
      .order('created_at', { ascending: true })
      .limit(1)

    if (!hotLeads?.length) {
      console.log('[Outreach] No email leads left to contact today')
      return
    }

    let sent = 0

    for (const lead of hotLeads) {
      try {
        // Re-fetch lead to guard against race condition before doing expensive AI call
        const { data: freshLead } = await supabase.from('leads').select('last_outreach_at').eq('id', lead.id).single()
        if (freshLead?.last_outreach_at != null) {
          console.log(`[Outreach] Skipping ${lead.name} — already contacted by another run`)
          continue
        }

        const body = await callAI(
          `You are Neha Sharma, Head of Growth at Levitate Labs from Vadodara, Gujarat.
Write a casual, friendly cold message to a local Indian business owner.
It will be sent via email.

RULES:
- NO em dashes (use simple hyphens or just spaces)
- NO fancy punctuation
- Keep it SHORT - under 60 words total
- Start with something casual like "Hi, I hope you are doing well"
- Mention ONE specific thing about their business type
- Point out a practical issue - like customers not finding them online
- Offer something free and easy - like a draft website mockup
- Sound like a real person talking, not a corporate robot
- End with a simple question they can easily answer
- Sign naturally: "- Pushpal, Founder"
- Return JSON format: {"subject": "simple subject for email", "body": "message body text"}
- NEVER mention AI, automation, bot, or agency`,
          JSON.stringify({
            business_name: lead.name,
            category: lead.service_category,
            city: lead.city,
            has_website: lead.has_website ?? false
          }),
          400,
          'outreach'
        )

        let subject = `Hi, quick question about ${lead.name}`
        let messageBody = body

        try {
          const parsed = JSON.parse(body)
          subject = parsed.subject ?? subject
          messageBody = parsed.body ?? body
        } catch {}

        messageBody = messageBody.replace(/---/g, '-').replace(/--/g, '-')
        subject = subject.replace(/---/g, '-').replace(/--/g, '-')

        const emailSuccess = await sendLeadEmail(lead.email, subject, messageBody)
        if (emailSuccess) {
          await supabase.from('leads').update({
            status: 'Contacted',
            outreach_count: (lead.outreach_count ?? 0) + 1,
            last_outreach_at: new Date().toISOString()
          }).eq('id', lead.id)

          await logEmail(supabase, {
            leadId: lead.id,
            agentName: 'outreach',
            toEmail: lead.email,
            subject,
            body: messageBody
          })

          await supabase.rpc('update_agent_credits', {
            p_agent_name: 'outreach',
            p_amount: 5,
            p_reason: `Outreach to ${lead.name}`
          })

          sent++
        }
      } catch (err) {
        console.error(`[Outreach] Failed for ${lead.name}:`, err)
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

export default outreachHandler

export const config: Config = {
  schedule: '*/15 * * * *'
}
