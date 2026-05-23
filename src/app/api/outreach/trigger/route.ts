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
          `You are Neha Sharma, Head of Growth at Levitate Labs from Vadodara, Gujarat.
Write a casual, friendly cold email to a local Indian business owner.

RULES:
- NO em dashes (use simple hyphens or just spaces)
- NO fancy punctuation
- Keep it SHORT - under 100 words total
- Subject should be simple like "Quick question about your business"
- Start with something casual like "Hi, I hope you are doing well"
- Mention ONE specific thing about their business type
- Point out something practical - customers cant find them on Google without a website
- Offer something free and easy - like a simple website mockup
- Sound like a real person talking, not a company
- End with a simple question they can easily answer
- Sign: "Thanks and regards, Neha Sharma | Head of Growth"
- Phone: +91-6299549112
- Return JSON format: {"subject": "simple subject", "body": "email body text"}
- NEVER mention AI, automation, bot, or agency`,
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
