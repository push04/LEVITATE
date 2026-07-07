/**
 * Retention Agent — Every Sunday 9:30 PM IST
 * Re-engages past clients via email: 30-day check-in, 90-day SEO upsell, 180-day annual plan.
 * Schedule: 16:00 UTC = 9:30 PM IST (Sunday)
 */

import type { Config } from '@netlify/functions'
import { sendEmail } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { awardCredits, CREDIT_EVENTS } from '../../src/lib/agents/base-agent'
import { requireInternalAuth } from './internal-auth'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

// Fixed templates only — no per-lead AI generation (same JSON-parsing
// failure mode confirmed elsewhere in this codebase: on parse failure this
// function used to fall through to `emailBody = body`, the raw unparsed AI
// text, and send that as-is to a paying client).
function fillClientTemplate(template: string, vars: { business_name: string; owner_name: string }): string {
  return template
    .replace(/\{business_name\}/g, vars.business_name)
    .replace(/\{owner_name\}/g, vars.owner_name)
}

const CHECKIN_30D_SUBJECT = 'How is the website going? - {business_name}'
const CHECKIN_30D_BODY = `Hi {owner_name},

It has been about a month since {business_name}'s website launched. How has it been going so far? If there is anything small you would like tweaked, happy to do one free adjustment.

Separately, if you would ever like us to keep an eye on updates and uptime ongoing, we offer a simple monthly maintenance plan for Rs. 1500/month, entirely optional.

Best,
Pushpal
Levitate Labs
levitatelabs.online`

const SEO_90D_SUBJECT = 'Get more customers from Google - {business_name}'
const SEO_90D_BODY = `Hi {owner_name},

It has been about 3 months since we built {business_name}'s website. Wanted to check in and mention something that might help: we can optimize the site so more people searching on Google actually find it, as a one-time Rs. 3000 project.

No pressure at all, just wanted to put it on your radar. Let me know if it sounds useful.

Best,
Pushpal
Levitate Labs`

export default async () => {
  const supabase = getServiceSupabase()

  try {
    const { data: clients } = await supabase
      .from('clients')
      .select('*, projects(*)')
      .eq('status', 'active')

    let messaged = 0

    for (const client of clients ?? []) {
      const delivered = (client.projects ?? []).filter((p: { status: string; delivered_at?: string }) => p.status === 'delivered' && p.delivered_at)
      if (!delivered.length || !client.email) continue

      const lastProject = delivered.sort((a: { delivered_at: string }, b: { delivered_at: string }) =>
        new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime()
      )[0]

      const days = daysSince(lastProject.delivered_at)
      const name = client.owner_name
      const templateVars = { business_name: client.business_name, owner_name: name }

      let stage = ''
      let subject = ''
      let emailBody = ''

      if (days === 30 || (days > 28 && days < 33)) {
        stage = '30d'
        subject = fillClientTemplate(CHECKIN_30D_SUBJECT, templateVars)
        emailBody = fillClientTemplate(CHECKIN_30D_BODY, templateVars)
      } else if (days === 90 || (days > 87 && days < 93)) {
        stage = '90d'
        subject = fillClientTemplate(SEO_90D_SUBJECT, templateVars)
        emailBody = fillClientTemplate(SEO_90D_BODY, templateVars)
      } else if (days === 180 || (days > 177 && days < 183)) {
        stage = '180d'
        subject = `6 months since your website launched!`
        emailBody = `Hi ${name},\n\nIt's been 6 months since we launched your website for ${client.business_name}! Hope it's been bringing in business!\n\nWe're offering an annual maintenance plan - security updates, speed optimization, content updates & priority support - for just Rs. 1499/month.\n\nWould you be interested?\n\nBest,\nPushpal\nLevitate Labs\nlevitatelabs.online`
      }

      if (!stage || !client.email) continue

      // This function runs every 12 hours but a client sits inside a given
      // day-window for 4-5 calendar days - without this guard the same
      // milestone email would go out on every run within that window
      // instead of once. Scope the dedup check to this stage's subject so
      // the 30d/90d/180d milestones don't suppress each other.
      const { data: alreadySent } = await supabase
        .from('agent_emails')
        .select('id')
        .eq('agent_name', 'retention')
        .eq('to_email', client.email)
        .eq('subject', subject)
        .gte('created_at', new Date(Date.now() - 10 * 86400000).toISOString())
        .limit(1)
      if (alreadySent?.length) continue

      const emailSent = await sendEmail(client.email, subject, emailBody)
      if (emailSent) {
        await supabase.from('agent_emails').insert({
          lead_id: null,
          agent_name: 'retention',
          direction: 'outbound',
          to_email: client.email,
          from_email: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'ai@levitatelabs.online',
          subject,
          body: emailBody,
          status: 'sent'
        })
        await awardCredits('retention', CREDIT_EVENTS.RETENTION_UPSELL, `Retention email (${stage}) to ${client.business_name}`)
        messaged++
      }
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'retention',
      action: 'weekly_retention',
      input: { clients: clients?.length ?? 0 },
      output: { messaged },
      status: 'success',
      credits_earned: messaged * 3
    })

    console.log(`[Retention] Emailed ${messaged} clients`)
  } catch (err) {
    console.error('[Retention] Failed:', err)
  }
}

export const config: Config = {
  // 16:00 UTC = 9:30 PM IST, Sundays only - matches the header comment.
  // This ran every 12 hours (every day) until now, which the day-window
  // matching (days>28 && days<33 etc) turns into ~8-10 redundant matches
  // per client per milestone; the dedup guard above now makes that safe,
  // but there is no reason to invoke this 60x more often than intended.
  schedule: '0 16 * * 0'
}
