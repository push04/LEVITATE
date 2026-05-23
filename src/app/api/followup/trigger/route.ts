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
      .limit(3) // Keep small for Netlify 10s limit on synchronous functions

    let followedUp = 0
    for (const lead of contactedLeads ?? []) {
      const days = lead.last_outreach_at ? daysSince(lead.last_outreach_at) : 0
      const count = lead.outreach_count ?? 1

      if (count === 1 && days >= 3) {
        const body = await callAI(
          `You are Rahul Desai, Client Relations at Levitate Labs from Vadodara.
Write a casual follow-up email (2nd contact).

RULES:
- NO em dashes or fancy punctuation
- Keep it under 80 words
- Try a different angle - offer something free like a simple mockup
- Be friendly, not pushy
- Sound like a real person following up
- End with something like "Would love to help if you are interested"
- Sign: "Thanks, Rahul Desai | Client Relations"
- Phone: +91-6299549112
- Return JSON: {"subject": "simple subject", "body": "email text"}
- NEVER mention AI, bot, or agency`,
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
          `You are Rahul Desai, Client Relations at Levitate Labs from Vadodara.
Write a FINAL follow-up email (3rd and last).

RULES:
- NO em dashes or fancy punctuation
- Keep it under 60 words
- Make it light and easy - no pressure
- Maybe mention a simple offer
- End with "No worries at all if you are not interested, wish you all the best"
- Sign: "Thanks, Rahul Desai | Client Relations"
- Phone: +91-6299549112
- Return JSON: {"subject": "simple subject", "body": "email text"}
- NEVER mention AI, bot, or agency`,
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
