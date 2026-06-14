import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { sendLeadEmail } from '@/lib/email/client'
import { getServiceSupabase } from '@/lib/supabase'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function POST() {
  const supabase = getServiceSupabase()

  try {
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'New')
      .is('last_outreach_at', null)
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5) // 5 per run — safe rate, clears backlog faster

    if (!hotLeads?.length) {
      return NextResponse.json({ success: true, message: 'No leads left to contact', sent: 0 })
    }

    let sent = 0
    for (const lead of hotLeads) {
      try {
        const body = await callAI(
          `You are Pushpal Sanyal, Founder of Levitate Labs from Vadodara, Gujarat.
Write a short, genuine cold email to a local Indian business owner about building them a website.

RULES:
- NO em dashes, NO fancy punctuation, NO corporate language
- Under 90 words total
- Subject: short and specific to their business type
- Open casually - like texting a local contact, not a sales pitch
- Mention ONE real problem their type of business has without a website (missed customers, no Google presence, etc.)
- Offer to share a free mockup or quick example - no strings
- End with ONE easy yes/no question
- Sign off: "Pushpal Sanyal | Founder, Levitate Labs | levitatelabs.online"
- Return JSON: {"subject": "...", "body": "..."}
- Write like a real founder reaching out personally, not a salesperson`,
          JSON.stringify({ business_name: lead.name ?? lead.business_name, category: lead.service_category ?? lead.category, city: lead.city }),
          400,
          'outreach'
        )

        let subject = `Hi, quick question about ${lead.name}`
        let emailBody = body
        try { 
          const p = JSON.parse(body); 
          subject = p.subject ?? subject; 
          emailBody = p.body ?? body 
        } catch { }
        
        // Clean up any remaining em dashes
        emailBody = emailBody.replace(/---/g, '-').replace(/--/g, '-')
        subject = subject.replace(/---/g, '-').replace(/--/g, '-')

        if (!lead.email) continue

        const success = await sendLeadEmail(lead.email, subject, emailBody)

        if (success) {
          // Update lead status
          await supabase.from('leads').update({
            status: 'Contacted',
            outreach_count: (lead.outreach_count ?? 0) + 1,
            last_outreach_at: new Date().toISOString()
          }).eq('id', lead.id)

          // Log agent action
          await supabase.from('agent_logs').insert({
            agent_name: 'outreach',
            action: 'email_sent',
            input: { lead_id: lead.id, business: lead.name ?? lead.business_name, to: lead.email },
            output: { sent: true, subject },
            status: 'success',
            credits_earned: 5
          })

          // Log to agent_emails table (appears in dashboard Emails tab).
          await supabase.from('agent_emails').insert({
            lead_id:    lead.id,
            agent_name: 'outreach',
            direction:  'outbound',
            to_email:   lead.email,
            from_email: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'ai@levitatelabs.online',
            subject,
            body:       emailBody,
            status:     'sent'
          })

          sent++
        }
      } catch (err) {
        console.error(`[Outreach] Failed for ${lead.name}:`, err)
      }
    }

    return NextResponse.json({ success: true, sent, total: hotLeads.length })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
