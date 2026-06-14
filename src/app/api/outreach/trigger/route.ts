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
Levitate Labs builds AI agents and automation systems for Indian businesses — things like: auto-replying to customer inquiries 24/7, following up with leads automatically, booking appointments without staff, sending reminders, and growing revenue without hiring more people.

Write a short genuine cold email to a local Indian business owner.

STRICT RULES:
- Under 85 words in the body
- NO mention of websites, Google, SEO, online presence, or social media — we are NOT a digital marketing agency
- NO greetings like "Hello sir" or "Dear sir" — use "Hi" or their business name directly
- NO em dashes, NO exclamation marks, NO buzzwords like "leverage", "cutting-edge", "innovative"
- Subject: 4-7 words, mention their business type specifically. E.g. "AI follow-ups for your clinic", "Auto-replies for your salon", "Saving time at your restaurant". NEVER generic subjects.
- Body: name ONE specific time-wasting or revenue-losing problem their business type faces (e.g. missing calls, forgetting to follow up, slow responses to inquiries, manual booking)
- Say how AI automation solves it — give ONE concrete example ("our system auto-replies to every WhatsApp inquiry within 30 seconds")
- Offer a free 15-min demo, zero commitment
- End with one yes/no question
- Sign: "Pushpal Sanyal | Founder, Levitate Labs | levitatelabs.online"
- Return JSON only: {"subject": "...", "body": "..."}`,
          JSON.stringify({ business_name: lead.name ?? lead.business_name, category: lead.service_category ?? lead.category, city: lead.city }),
          400,
          'outreach'
        )

        let subject = `Hi, quick question about ${lead.name}`
        let emailBody = body
        try {
          const jsonMatch = body.match(/\{[\s\S]*\}/)
          const p = JSON.parse(jsonMatch ? jsonMatch[0] : body)
          subject = p.subject ?? subject
          emailBody = p.body ?? emailBody
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
