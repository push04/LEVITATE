import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { notifyFounder } from '@/lib/email/client'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Dedup guard — block if already sent in last 10 minutes (prevents dashboard spam-clicks)
  const dedupSince = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recentSent } = await supabase
    .from('agent_logs')
    .select('id')
    .eq('agent_name', 'reporter')
    .eq('action', 'status_email')
    .eq('output->>email_sent', 'true')
    .gte('created_at', dedupSince)
    .limit(1)
  if (recentSent?.length) {
    return NextResponse.json({ success: true, skipped: true, reason: 'Email sent recently, try again in a few minutes' })
  }

  try {
    const since = new Date(Date.now() - 31 * 60 * 1000).toISOString()
    const sinceDay = new Date(Date.now() - 86400000).toISOString()
    const now = new Date()
    
    const [newLogsRes, newLeadsRes, revenueRes, failuresRes] = await Promise.all([
      supabase.from('agent_logs').select('agent_name, action, status, credits_earned').gte('created_at', since),
      supabase.from('leads').select('name, score, status').gte('created_at', since),
      supabase.from('revenue').select('amount, type').gte('received_at', since),
      supabase.from('agent_logs').select('agent_name, action').gte('created_at', since).eq('status', 'failure')
    ])
    
    const recentActivity = newLogsRes.data?.length ?? 0
    const newLeads = newLeadsRes.data?.length ?? 0
    const newRevenue = (revenueRes.data ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0)
    const failures = failuresRes.data?.length ?? 0
    
    const [allLeadsRes, projectsRes, allRevenueRes] = await Promise.all([
      supabase.from('leads').select('status, score, name').gte('created_at', sinceDay),
      supabase.from('projects').select('status, name').neq('status', 'closed'),
      supabase.from('revenue').select('amount').gte('received_at', sinceDay)
    ])
    
    const totalDayRevenue = (allRevenueRes.data ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0)
    
    const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })
    
    const subject = newRevenue > 0
      ? `[PAYMENT] Rs.${newRevenue.toLocaleString('en-IN')} received — Levitate Labs ${timeStr}`
      : newLeads > 0
      ? `[NEW LEADS] ${newLeads} leads found — Levitate Labs ${timeStr}`
      : failures > 0
      ? `[ALERT] ${failures} agent failures — Levitate Labs ${timeStr}`
      : `[Status] Levitate Labs update — ${dateStr} ${timeStr}`
    
    const body = await callAI(
      `You are the automated reporter for Levitate Labs web agency.
Write a brief status update email (max 150 words). Plain text only, no markdown.
Be direct and factual. If there is revenue, make it prominent.
Sign off: "— Levitate Labs Automation"`,
      JSON.stringify({
        period: 'last 30 minutes',
        new_leads: newLeads,
        new_revenue_inr: newRevenue,
        agent_failures: failures,
        agents_active: recentActivity,
        day_total_leads: allLeadsRes.data?.length ?? 0,
        day_total_revenue: totalDayRevenue,
        active_projects: projectsRes.data?.length ?? 0,
        recent_leads: newLeadsRes.data?.slice(0, 3).map((l: { name: string }) => l.name)
      }),
      300,
      'reporter'
    )
    
    const emailSent = await notifyFounder(subject, body)

    // Log reporter email to agent_emails for admin dashboard visibility.
    if (emailSent) {
      try {
        await supabase.from('agent_emails').insert({
          lead_id:    null,
          agent_name: 'reporter',
          direction:  'outbound',
          to_email:   process.env.SMTP_FROM ?? 'founder@levitatelabs.online',
          from_email: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'ai@levitatelabs.online',
          subject,
          body,
          status: 'sent'
        })
      } catch {}
    }
    
    await supabase.from('agent_logs').insert({
      agent_name: 'reporter',
      action: 'status_email',
      input: { period: '30min', manual: true },
      output: { subject, new_leads: newLeads, new_revenue: newRevenue, email_sent: emailSent },
      status: 'success',
      credits_earned: 1
    })
    
    return NextResponse.json({ 
      success: true, 
      email_sent: emailSent,
      stats: {
        recent_activity: recentActivity,
        new_leads: newLeads,
        new_revenue: newRevenue,
        failures: failures,
        day_total_leads: allLeadsRes.data?.length ?? 0,
        day_total_revenue: totalDayRevenue,
        active_projects: projectsRes.data?.length ?? 0
      }
    })
  } catch (err) {
    console.error('[Reporter API] Failed:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
