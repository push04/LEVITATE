import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendLeadEmail } from '@/lib/email/client'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

// Fixed templates only — no per-lead AI generation. The AI-generated JSON
// occasionally failed to parse (this file used to fall through to sending
// the raw, unparsed AI response as the email body on failure), so both
// follow-up steps now use a plain {business_name}/{category} substitution
// instead, same as the initial outreach template.
function fillTemplate(template: string, lead: { name?: string; business_name?: string; service_category?: string; category?: string }): string {
  const vars: Record<string, string> = {
    business_name: lead.name ?? lead.business_name ?? 'your business',
    category: lead.service_category ?? lead.category ?? 'business',
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
        const subject = fillTemplate(DAY3_FOLLOWUP_SUBJECT, lead)
        const emailBody = fillTemplate(DAY3_FOLLOWUP_BODY, lead)

        if (await sendLeadEmail(lead.email, subject, emailBody)) {
          await supabase.from('leads').update({ outreach_count: 2, last_outreach_at: new Date().toISOString() }).eq('id', lead.id)
          await logEmail(supabase, lead.id, lead.email, subject, emailBody)
          await supabase.from('agent_logs').insert({ agent_name: 'followup', action: 'followup_day3', input: { lead_id: lead.id }, output: { subject }, status: 'success', credits_earned: 3 })
          followedUp++
        }
      } else if (count >= 2 && days >= 7) {
        const subject = fillTemplate(FINAL_FOLLOWUP_SUBJECT, lead)
        const emailBody = fillTemplate(FINAL_FOLLOWUP_BODY, lead)

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
