import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { sendLeadEmail } from '@/lib/email/client'
import { getServiceSupabase } from '@/lib/supabase'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

async function logEmail(supabase: ReturnType<typeof getServiceSupabase>, leadId: string, to: string, subject: string, body: string, agentName = 'followup') {
  try {
    await supabase.from('agent_emails').insert({
      lead_id:    leadId,
      agent_name: agentName,
      direction:  'outbound',
      to_email:   to,
      from_email: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'ai@levitatelabs.online',
      subject,
      body,
      status: 'sent'
    })
  } catch { /* non-fatal */ }
}

export async function POST() {
  const supabase = getServiceSupabase()

  try {
    const { data: contactedLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'Contacted')
      .not('last_outreach_at', 'is', null)
      .not('email', 'is', null)
      .limit(1) // 1 per cron run — avoid burst sending

    let followedUp = 0
    for (const lead of contactedLeads ?? []) {
      const days = lead.last_outreach_at ? daysSince(lead.last_outreach_at) : 0
      const count = lead.outreach_count ?? 1

      if (count === 1 && days >= 3) {
        const body = await callAI(
          `You are Pushpal Sanyal, Founder of Levitate Labs from Vadodara.
Write a short follow-up email (2nd contact, sent 3 days after first email).

RULES:
- NO em dashes or fancy punctuation
- Under 70 words
- Acknowledge you messaged before - don't pretend it's a fresh email
- Try a slightly different angle - maybe mention a specific result or a free offer
- Keep it light, zero pressure
- End with a soft question like "Would this be useful for you?"
- Sign: "Pushpal Sanyal | Levitate Labs | levitatelabs.online"
- Return JSON: {"subject": "...", "body": "..."}
- Write like a genuine person checking in, not a sales sequence`,
          JSON.stringify({ business_name: lead.name, category: lead.service_category }),
          250,
          'followup'
        )

        let subject = `Following up on my earlier message - ${lead.name}`
        let emailBody = body
        try { 
          const p = JSON.parse(body); 
          subject = p.subject ?? subject; 
          emailBody = p.body ?? body 
        } catch { }
        
        emailBody = emailBody.replace(/---/g, '-').replace(/--/g, '-')
        subject = subject.replace(/---/g, '-').replace(/--/g, '-')

        if (await sendLeadEmail(lead.email, subject, emailBody)) {
          await supabase.from('leads').update({ outreach_count: 2, last_outreach_at: new Date().toISOString() }).eq('id', lead.id)
          await logEmail(supabase, lead.id, lead.email, subject, emailBody)
          await supabase.from('agent_logs').insert({ agent_name: 'followup', action: 'followup_day3', input: { lead_id: lead.id }, output: { subject }, status: 'success', credits_earned: 3 })
          followedUp++
        }
      } else if (count >= 2 && days >= 7) {
        const body = await callAI(
          `You are Pushpal Sanyal, Founder of Levitate Labs from Vadodara.
Write a final follow-up email (3rd and last contact).

RULES:
- NO em dashes or fancy punctuation
- Under 55 words - very short
- Be completely honest that this is the last message, no pressure at all
- Leave the door open warmly - if they ever need help they can reach out
- No offer, no pitch - just a genuine sign-off
- Sign: "Pushpal Sanyal | Levitate Labs | levitatelabs.online"
- Return JSON: {"subject": "...", "body": "..."}
- Make it feel like a real human gracefully bowing out`,
          JSON.stringify({ business_name: lead.name }),
          200,
          'followup'
        )

        let subject = `One last try - ${lead.name}`
        let emailBody = body
        try { 
          const p = JSON.parse(body); 
          subject = p.subject ?? subject; 
          emailBody = p.body ?? body 
        } catch { }
        
        emailBody = emailBody.replace(/---/g, '-').replace(/--/g, '-')
        subject = subject.replace(/---/g, '-').replace(/--/g, '-')

        if (await sendLeadEmail(lead.email, subject, emailBody)) {
          await supabase.from('leads').update({ outreach_count: 3, status: 'Follow Up' }).eq('id', lead.id)
          await logEmail(supabase, lead.id, lead.email, subject, emailBody)
          await supabase.from('agent_logs').insert({ agent_name: 'followup', action: 'followup_day7_final', input: { lead_id: lead.id }, output: { subject }, status: 'success', credits_earned: 3 })
          followedUp++
        }
      }
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'followup',
      action: 'followup_cycle_complete',
      input: { candidates: contactedLeads?.length ?? 0 },
      output: { followed_up: followedUp },
      status: 'success',
      credits_earned: followedUp * 2
    })

    return NextResponse.json({ success: true, followedUp, total: contactedLeads?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
