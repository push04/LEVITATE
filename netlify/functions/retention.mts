/**
 * Retention Agent — Every Sunday 9:30 PM IST
 * Re-engages past clients via email: 30-day check-in, 90-day SEO upsell, 180-day annual plan.
 * Schedule: 16:00 UTC = 9:30 PM IST (Sunday)
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { sendEmail } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { awardCredits, CREDIT_EVENTS } from '../../src/lib/agents/base-agent'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

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

      let subject = ''
      let body = ''

      if (days === 30 || (days > 28 && days < 33)) {
        // 30-day check-in + maintenance upsell
        body = await callAI(
          `Write a warm email check-in for a satisfied client.
Their website launched ${days} days ago.
Goals: 1) Ask how it's going 2) Offer 1 free tweak 3) Softly mention monthly maintenance plan (₹1500/month)
Keep it short, warm, conversational. NOT salesy.
Return JSON: {"subject": "...", "body": "..."}
Sign: "Pushpal\nLevitate Labs\nlevitatelabs.online"`,
          JSON.stringify({ business_name: client.business_name, owner_name: name, project_type: lastProject.type }),
          300,
          'retention'
        )
        subject = `How is the website going? — ${client.business_name}`
      } else if (days === 90 || (days > 87 && days < 93)) {
        // 3-month SEO upsell
        body = await callAI(
          `Write an email to a happy client we built a website for 3 months ago.
Offer: "We can optimize your site for Google — so more people find you."
Price: ₹3000 one-time
Casual, friendly, not pushy. End with a soft question.
Return JSON: {"subject": "...", "body": "..."}
Sign: "Pushpal\nLevitate Labs"`,
          JSON.stringify({ business_name: client.business_name, owner_name: name }),
          250,
          'retention'
        )
        subject = `Get more customers from Google — ${client.business_name}`
      } else if (days === 180 || (days > 177 && days < 183)) {
        // 6-month anniversary + annual plan
        subject = `6 months since your website launched! 🎉`
        body = `Hi ${name},\n\nIt's been 6 months since we launched your website for ${client.business_name}! Hope it's been bringing in business!\n\nWe're offering an annual maintenance plan — security updates, speed optimization, content updates & priority support — for just ₹1499/month.\n\nWould you be interested?\n\nBest,\nPushpal\nLevitate Labs\nlevitatelabs.online`
      }

      let emailBody = body
      try {
        const p = JSON.parse(body)
        subject = p.subject ?? subject
        emailBody = p.body ?? body
      } catch { /* use raw */ }

      if (emailBody && client.email) {
        await sendEmail(client.email, subject, emailBody)
        await awardCredits('retention', CREDIT_EVENTS.LEAD_FOUND_AND_SCORED, `Retention email to ${client.business_name}`)
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
  schedule: '0 */12 * * *' // Every 12 hours
}
