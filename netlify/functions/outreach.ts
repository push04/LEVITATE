import type { Config } from '@netlify/functions'
import { sendLeadEmail } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

// Fixed template only — no per-lead AI generation. The AI-generated JSON
// occasionally failed to parse, leaving messageBody defaulted to the raw,
// unparsed AI response (literal {"subject": "...", "body": "..."} text sent
// to real leads - confirmed in agent_emails for ~41% of all outreach/followup
// sends). Uses the same admin-editable outreach_templates row as the
// non-cron /api/outreach/trigger route.
function fillTemplate(template: string, lead: { name?: string; service_category?: string; city?: string }): string {
  const vars: Record<string, string> = {
    business_name: lead.name ?? 'your business',
    category: lead.service_category ?? 'business',
    city: lead.city ?? 'your city',
  }
  return template.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`)
}

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
    const { data: activeTemplate } = await supabase
      .from('outreach_templates')
      .select('subject, body')
      .eq('is_active', true)
      .maybeSingle()

    if (!activeTemplate) {
      console.log('[Outreach] No active outreach template configured - skipping')
      return
    }

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
        // Re-fetch lead to guard against race condition
        const { data: freshLead } = await supabase.from('leads').select('last_outreach_at').eq('id', lead.id).single()
        if (freshLead?.last_outreach_at != null) {
          console.log(`[Outreach] Skipping ${lead.name} — already contacted by another run`)
          continue
        }

        const subject = fillTemplate(activeTemplate.subject, lead)
        const messageBody = fillTemplate(activeTemplate.body, lead)

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
