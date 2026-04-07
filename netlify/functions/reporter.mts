/**
 * Reporter Agent — Daily 8 AM IST
 * Sends Pushpal a WhatsApp morning digest of everything that happened.
 * Schedule: 2:30 AM UTC = 8:00 AM IST
 */

import type { Config } from '@netlify/functions'
import { callAI } from '../../src/lib/ai/router'
import { sendWhatsAppToOwner } from '../../src/lib/whatsapp/client'
import { getServiceSupabase } from '../../src/lib/supabase'

export default async () => {
  const supabase = getServiceSupabase()
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  try {
    const [leadsRes, projectsRes, revenueRes, agentRes, logsRes] = await Promise.all([
      supabase.from('leads').select('status, score, business_name').gte('created_at', yesterday),
      supabase.from('projects').select('status, name').neq('status', 'closed'),
      supabase.from('revenue').select('amount, type').gte('received_at', yesterday),
      supabase.from('agent_rewards').select('agent_name, current_balance, success_rate, is_suspended').order('current_balance', { ascending: false }).limit(5),
      supabase.from('agent_logs').select('agent_name, action, status').gte('created_at', yesterday).eq('status', 'failure')
    ])

    const totalRevenue = (revenueRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
    const newLeads = leadsRes.data?.length ?? 0
    const activeProjects = projectsRes.data?.length ?? 0
    const failures = logsRes.data?.length ?? 0
    const topAgent = agentRes.data?.[0]

    const summary = await callAI(
      `You are the daily reporter for Levitate Labs, a web agency run by Pushpal.
Write a concise WhatsApp morning briefing (max 250 words).
Use emojis. Format for WhatsApp (NO markdown, NO asterisks for bold).
Today's date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}`,
      JSON.stringify({
        new_leads_yesterday: newLeads,
        active_projects: activeProjects,
        revenue_yesterday_inr: totalRevenue,
        agent_failures_yesterday: failures,
        top_performing_agent: topAgent?.agent_name,
        top_agent_balance: topAgent?.current_balance,
        recent_leads: leadsRes.data?.slice(0, 3)?.map(l => l.business_name)
      }),
      500,
      'reporter'
    )

    await sendWhatsAppToOwner(summary)

    await supabase.from('agent_logs').insert({
      agent_name: 'reporter',
      action: 'daily_report',
      input: {},
      output: { summary, metrics: { newLeads, activeProjects, totalRevenue, failures } },
      status: 'success',
      credits_earned: 2
    })

    await supabase.rpc('update_agent_credits', { p_agent_name: 'reporter', p_amount: 2, p_reason: 'daily_report_sent' })

  } catch (err) {
    console.error('[Reporter] Failed:', err)
    await sendWhatsAppToOwner(`⚠️ Reporter agent failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: Config = {
  schedule: '30 2 * * *' // 8:00 AM IST
}
