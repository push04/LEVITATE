import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { sendLeadEmail } from '@/lib/email/client'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  try {
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'New')
      .is('last_outreach_at', null)
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1) // 1 per cron run (every 20min) = max 72/day — safe for domain warm-up

    if (!hotLeads?.length) {
      return NextResponse.json({ success: true, message: 'No leads left to contact', sent: 0 })
    }

    let sent = 0
    for (const lead of hotLeads) {
      try {
        const body = await callAI(
          `You are Pushpal Sanyal, Founder of Levitate Labs from Vadodara, Gujarat.
Levitate Labs helps Indian businesses grow using AI and automation - things like auto-responding to leads, following up with customers automatically, generating content, and getting more inquiries without extra staff.

Write a short genuine cold email to a local Indian business owner.

STRICT RULES:
- Under 90 words in the body
- NO greetings like "Hello sir" or "Dear sir" - use "Hi" or their business name
- NO em dashes, NO exclamation marks, NO corporate buzzwords like "leverage" or "cutting-edge"
- Subject line: 4-7 words, mention their specific business type. Examples: "Quick idea for your restaurant", "Helping salons get more bookings", "Auto-follow-up for your clinic". NEVER use generic subjects.
- Body: mention ONE specific manual/repetitive problem their type of business has (missed calls, slow follow-ups, no online presence, losing customers to competitors)
- Mention that AI can handle it automatically - give one concrete example relevant to their category
- Offer a free 15-min call or demo, no strings
- End with one simple yes/no question
- Sign: "Pushpal Sanyal | Founder, Levitate Labs | levitatelabs.online"
- Return JSON only: {"subject": "...", "body": "..."}`,
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
