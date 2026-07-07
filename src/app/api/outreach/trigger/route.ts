import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
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

    // Fixed template only — no per-lead AI generation. AI-generated subject/body
    // occasionally failed to parse cleanly (malformed JSON leaking into the
    // sent body), so this always uses the admin-saved active template with
    // simple {business_name}/{category}/{city} substitution instead.
    const { data: activeTemplate } = await supabase
      .from('outreach_templates')
      .select('subject, body')
      .eq('is_active', true)
      .maybeSingle()

    if (!activeTemplate) {
      return NextResponse.json({ success: false, error: 'No active outreach template configured', sent: 0 })
    }

    let sent = 0
    for (const lead of hotLeads) {
      try {
        if (!lead.email) continue

        const vars: Record<string, string> = {
          business_name: lead.name ?? lead.business_name ?? 'your business',
          category: lead.service_category ?? lead.category ?? 'business',
          city: lead.city ?? 'your city',
        }
        const subject = activeTemplate.subject.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`)
        const emailBody = activeTemplate.body.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`)

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
