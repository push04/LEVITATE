/**
 * Reporter Agent — Every 30 minutes
 * Emails founder@levitatelabs.online with a status update.
 * Only sends if there are new events in the last 30 minutes (no spam).
 * Full hourly digest sent once per hour regardless.
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { notifyFounder } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'

export default async () => {
  const supabase = getServiceSupabase()
  const since = new Date(Date.now() - 31 * 60 * 1000).toISOString() // last 31 min
  const sinceDay = new Date(Date.now() - 86400000).toISOString()
  const now = new Date()
  const isFullHour = now.getUTCMinutes() < 5 // send full digest at top of each hour

  try {
    const [newLogsRes, newLeadsRes, revenueRes, failuresRes] = await Promise.all([
      supabase.from('agent_logs').select('agent_name, action, status, credits_earned').gte('created_at', since),
      supabase.from('leads').select('business_name, score, status').gte('created_at', since),
      supabase.from('revenue').select('amount, type').gte('received_at', since),
      supabase.from('agent_logs').select('agent_name, action').gte('created_at', since).eq('status', 'failure')
    ])

    const recentActivity = newLogsRes.data?.length ?? 0
    const newLeads = newLeadsRes.data?.length ?? 0
    const newRevenue = (revenueRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    const failures = failuresRes.data?.length ?? 0

    // Skip email if nothing happened and it's not a full hour
    if (!isFullHour && recentActivity === 0 && newLeads === 0 && newRevenue === 0) {
      console.log('[Reporter] Nothing new in last 30 min, skipping email')
      return
    }

    // For full hourly digest, pull 24h stats
    const [allLeadsRes, projectsRes, allRevenueRes, topAgentRes] = await Promise.all([
      supabase.from('leads').select('status, score, business_name').gte('created_at', sinceDay),
      supabase.from('projects').select('status, name').neq('status', 'closed'),
      supabase.from('revenue').select('amount').gte('received_at', sinceDay),
      supabase.from('agent_rewards').select('agent_name, current_balance').order('current_balance', { ascending: false }).limit(1)
    ])

    const totalDayRevenue = (allRevenueRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)

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
        period: isFullHour ? 'last 1 hour' : 'last 30 minutes',
        new_leads: newLeads,
        new_revenue_inr: newRevenue,
        agent_failures: failures,
        agents_active: recentActivity,
        day_total_leads: allLeadsRes.data?.length ?? 0,
        day_total_revenue: totalDayRevenue,
        active_projects: projectsRes.data?.length ?? 0,
        top_agent: topAgentRes.data?.[0]?.agent_name ?? 'none',
        recent_leads: newLeadsRes.data?.slice(0, 3).map(l => l.business_name)
      }),
      300,
      'reporter'
    )

    await notifyFounder(subject, body)

    await supabase.from('agent_logs').insert({
      agent_name: 'reporter',
      action: 'status_email',
      input: { period: '30min', had_events: recentActivity > 0 },
      output: { subject, new_leads: newLeads, new_revenue: newRevenue },
      status: 'success',
      credits_earned: 1
    })

  } catch (err) {
    console.error('[Reporter] Failed:', err)
  }
}

export const config: Config = {
  schedule: '*/30 * * * *' // Every 30 minutes
}
