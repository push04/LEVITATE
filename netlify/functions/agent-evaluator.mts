/**
 * Agent Evaluator — Every Sunday 11 PM IST
 * Weekly performance review for all agents.
 * Awards bonus credits for great performance, penalizes failures.
 * Schedule: 17:30 UTC = 11:00 PM IST Sunday
 */

import type { Config } from '@netlify/functions'
import { sendWhatsAppToOwner } from '../../src/lib/whatsapp/client'
import { getServiceSupabase } from '../../src/lib/supabase'

const CREDIT_THRESHOLDS = [
  { min: 1000, multiplier: 2.0, priority: 0, status: 'legendary' },
  { min: 500, multiplier: 1.5, priority: 1, status: 'elite' },
  { min: 200, multiplier: 1.25, priority: 3, status: 'performing' },
  { min: 100, multiplier: 1.0, priority: 5, status: 'normal' },
  { min: 50, multiplier: 0.75, priority: 8, status: 'normal' },
  { min: 0, multiplier: 0.5, priority: 10, status: 'probation' }
]

function getPrivileges(balance: number) {
  return CREDIT_THRESHOLDS.find(t => balance >= t.min) ?? CREDIT_THRESHOLDS[CREDIT_THRESHOLDS.length - 1]
}

export default async () => {
  const supabase = getServiceSupabase()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  try {
    const { data: agents } = await supabase.from('agent_rewards').select('*')
    const highlights: string[] = []

    for (const agent of agents ?? []) {
      const { data: weeklyLogs } = await supabase
        .from('agent_logs')
        .select('status, credits_earned')
        .eq('agent_name', agent.agent_name)
        .gte('created_at', weekAgo)

      if (!weeklyLogs?.length) continue

      const success = weeklyLogs.filter(l => l.status === 'success').length
      const failed = weeklyLogs.filter(l => l.status === 'failure').length
      const total = weeklyLogs.length
      const successRate = total > 0 ? (success / total) * 100 : 100
      const creditsThisWeek = weeklyLogs.reduce((s, l) => s + (l.credits_earned ?? 0), 0)

      let bonus = 0
      if (successRate > 95) bonus += 50   // Perfect week
      else if (successRate > 80) bonus += 20 // Good week
      if (successRate < 50) bonus -= 30
      if (failed > 10) bonus -= 50

      const newBalance = Math.max(0, agent.current_balance + bonus)
      const privileges = getPrivileges(newBalance)

      await supabase.from('agent_rewards').update({
        current_balance: newBalance,
        total_credits_earned: agent.total_credits_earned + Math.max(0, bonus),
        total_tasks_completed: (agent.total_tasks_completed ?? 0) + success,
        total_tasks_failed: (agent.total_tasks_failed ?? 0) + failed,
        success_rate: Math.round(successRate * 100) / 100,
        api_budget_multiplier: privileges.multiplier,
        priority_level: privileges.priority,
        last_active_at: new Date().toISOString()
      }).eq('agent_name', agent.agent_name)

      // Suspend agents with 0 credits
      if (newBalance <= 0) {
        await supabase.from('agent_rewards').update({
          is_suspended: true,
          suspension_reason: 'Credit balance depleted after weekly evaluation'
        }).eq('agent_name', agent.agent_name)
        highlights.push(`⛔ ${agent.agent_name} SUSPENDED (credits depleted)`)
      }

      if (privileges.status === 'elite' || privileges.status === 'legendary') {
        highlights.push(`🏆 ${agent.agent_name} achieved ${privileges.status.toUpperCase()} status! (${newBalance} cr)`)
      }
    }

    // Send weekly summary to Pushpal
    const topAgents = (agents ?? []).sort((a, b) => b.current_balance - a.current_balance).slice(0, 3)
    const summary = `🤖 WEEKLY AGENT REPORT

Top performers:
${topAgents.map((a, i) => `${i + 1}. ${a.agent_name} — ${a.current_balance} credits`).join('\n')}

${highlights.length > 0 ? `\nHighlights:\n${highlights.join('\n')}` : ''}

All agents evaluated. Check /admin/dashboard/automations for details.`

    await sendWhatsAppToOwner(summary)

    await supabase.from('agent_logs').insert({
      agent_name: 'agent_evaluator',
      action: 'weekly_evaluation',
      input: { agents_evaluated: agents?.length ?? 0 },
      output: { highlights },
      status: 'success',
      credits_earned: 10
    })

    console.log('[AgentEvaluator] Weekly evaluation complete')
  } catch (err) {
    console.error('[AgentEvaluator] Failed:', err)
  }
}

export const config: Config = {
  schedule: '30 17 * * 0' // Sunday 11:00 PM IST
}
