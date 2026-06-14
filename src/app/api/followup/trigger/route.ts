import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { sendLeadEmail } from '@/lib/email/client'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

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

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
Levitate Labs builds AI automation systems for Indian businesses — auto-replies to customer inquiries, automated lead follow-ups, appointment booking bots, WhatsApp automation, and agentic AI for business growth.

Write a short follow-up email (2nd contact, 3 days after first).

RULES:
- Under 70 words
- NO mention of websites, Google, SEO, social media, "find you online" — we are NOT a digital marketing agency
- NO em dashes, NO exclamation marks, NO "sir"
- Acknowledge you messaged before briefly
- Try a different angle — mention a specific AI automation result like "a clinic we worked with now handles 40 appointment bookings a day with zero staff"
- Zero pressure, light tone
- End with one soft question about whether AI automation might help them
- Sign: "Pushpal Sanyal | Levitate Labs | levitatelabs.online"
- Return JSON: {"subject": "...", "body": "..."}`,
          JSON.stringify({ business_name: lead.name, category: lead.service_category }),
          250,
          'followup'
        )

        let subject = `Following up on my earlier message - ${lead.name}`
        let emailBody = body
        try {
          const jsonMatch = body.match(/\{[\s\S]*\}/)
          const p = JSON.parse(jsonMatch ? jsonMatch[0] : body)
          subject = p.subject ?? subject
          emailBody = p.body ?? emailBody
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
- Under 55 words - keep it very short
- NO mention of websites, Google, SEO, social media, or "online presence" — we do AI automation, not digital marketing
- NO em dashes, NO exclamation marks, NO "sir"
- Be honest this is the last message - no pressure
- One line reminder: we help businesses automate repetitive work (follow-ups, inquiries, bookings) using AI
- Leave the door open warmly — if timing is ever right, they can reach out
- No hard pitch
- Sign: "Pushpal Sanyal | Levitate Labs | levitatelabs.online"
- Return JSON: {"subject": "...", "body": "..."}`,
          JSON.stringify({ business_name: lead.name }),
          200,
          'followup'
        )

        let subject = `One last try - ${lead.name}`
        let emailBody = body
        try {
          const jsonMatch = body.match(/\{[\s\S]*\}/)
          const p = JSON.parse(jsonMatch ? jsonMatch[0] : body)
          subject = p.subject ?? subject
          emailBody = p.body ?? emailBody
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
