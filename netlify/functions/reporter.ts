/**
 * Reporter Agent — Every 1 hour
 * Emails founder@levitatelabs.online with a status update.
 * Only sends if there are new events in the last hour (no spam).
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { notifyFounder } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

export default async () => {
  const supabase = getServiceSupabase()
  const since    = new Date(Date.now() - 61 * 60 * 1000).toISOString() // last 61 min
  const sinceDay = new Date(Date.now() - 86400000).toISOString()
  const now      = new Date()

  try {
    const [newLogsRes, newLeadsRes, revenueRes, failuresRes] = await Promise.all([
      supabase.from('agent_logs').select('agent_name, action, status, credits_earned').gte('created_at', since),
      supabase.from('leads').select('name, ai_score, status').gte('created_at', since),
      supabase.from('revenue').select('amount, type').gte('received_at', since),
      supabase.from('agent_logs').select('agent_name, action').gte('created_at', since).eq('status', 'failure')
    ])

    const recentActivity = newLogsRes.data?.length ?? 0
    const newLeads       = newLeadsRes.data?.length ?? 0
    const newRevenue     = (revenueRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    const failures       = failuresRes.data?.length ?? 0

    // Skip email unless something actually worth reporting happened. Deliberately
    // NOT gated on `recentActivity` (agent_logs count) alone — background
    // heartbeat/scheduler jobs log routine entries almost every hour regardless
    // of outcome, which made this guard nearly always pass and sent a generic
    // "[Status]" email every hour even when nothing meaningful occurred.
    if (newLeads === 0 && newRevenue === 0 && failures === 0) {
      console.log('[Reporter] Nothing important in last hour, skipping email')
      await supabase.from('agent_logs').insert({
        agent_name: 'reporter', action: 'status_email',
        input: { period: '1hr', had_events: false },
        output: { skipped: true }, status: 'success', credits_earned: 0
      })
      return
    }

    // Dedup guard — skip if reporter already sent an email in the last 50 minutes
    const dedupSince = new Date(Date.now() - 50 * 60 * 1000).toISOString()
    const { data: recentSent } = await supabase
      .from('agent_logs')
      .select('id')
      .eq('agent_name', 'reporter')
      .eq('action', 'status_email')
      .eq('output->>email_sent', 'true')
      .gte('created_at', dedupSince)
      .limit(1)
    if (recentSent?.length) {
      console.log('[Reporter] Already sent email in last 50 min, skipping duplicate')
      return
    }

    // Pull 24h stats for the digest
    const [allLeadsRes, allRevenueRes, topAgentRes, bizdevLeadsRes] = await Promise.all([
      supabase.from('leads').select('status, ai_score, name').gte('created_at', sinceDay),
      supabase.from('revenue').select('amount').gte('received_at', sinceDay),
      supabase.from('agent_rewards').select('agent_name, current_balance').order('current_balance', { ascending: false }).limit(1),
      // Automation leads breakdown
      supabase.from('leads').select('status').eq('source', 'bizdev_agent')
    ])

    const totalDayRevenue = (allRevenueRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)

    // Pipeline counts from automation
    const pipelineData = bizdevLeadsRes.data ?? []
    const pipeline = {
      total:     pipelineData.length,
      new:       pipelineData.filter(l => l.status === 'New').length,
      contacted: pipelineData.filter(l => l.status === 'Contacted').length,
      closed:    pipelineData.filter(l => l.status === 'Closed').length,
    }

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
Write a brief status update email (max 200 words). Plain text only, no markdown.
Be direct and factual. If there is revenue, make it prominent.
Include the leads pipeline summary. Sign off: "— Levitate Labs Automation"`,
      JSON.stringify({
        period:              'last 1 hour',
        new_leads_this_hour: newLeads,
        new_revenue_inr:     newRevenue,
        agent_failures:      failures,
        agents_active:       recentActivity,
        day_total_leads:     allLeadsRes.data?.length ?? 0,
        day_total_revenue:   totalDayRevenue,
        top_agent:           topAgentRes.data?.[0]?.agent_name ?? 'none',
        recent_lead_names:   (newLeadsRes.data ?? []).slice(0, 5).map(l => l.name).filter(Boolean),
        automation_pipeline: pipeline,
      }),
      400,
      'reporter'
    )

    const emailSent = await notifyFounder(subject, body)

    // ★ Log to agent_emails (visible in dashboard Emails tab)
    if (emailSent) {
      await supabase.from('agent_emails').insert({
        lead_id:    null,
        agent_name: 'reporter',
        direction:  'outbound',
        to_email:   process.env.SMTP_FROM ?? 'founder@levitatelabs.online',
        from_email: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'agent@levitatelabs.online',
        subject,
        body,
        status: 'sent'
      }).catch(() => {})
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'reporter',
      action:     'status_email',
      input:      { period: '1hr', had_events: recentActivity > 0 },
      output:     { subject, new_leads: newLeads, new_revenue: newRevenue, email_sent: emailSent },
      status:     'success',
      credits_earned: 1
    })

  } catch (err) {
    console.error('[Reporter] Failed:', err)
    await supabase.from('agent_logs').insert({
      agent_name: 'reporter', action: 'status_email',
      input: {}, output: { error: String(err) },
      status: 'failure', credits_earned: 0
    }).catch(() => {})
  }
}

export const config: Config = {
  schedule: '0 * * * *' // Every 1 hour (on the hour)
}
