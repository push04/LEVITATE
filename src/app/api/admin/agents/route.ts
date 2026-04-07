/**
 * Agent Management API
 * GET: All agent status + rewards (auto-seeds if table is empty)
 * POST: Suspend/unsuspend/reset/update_gemma_url
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

const ALL_AGENTS = [
  { name: 'bizdev',           label: 'BizDev',           schedule: 'Daily 6:00 AM IST',    cron: '30 0 * * *' },
  { name: 'outreach',         label: 'Outreach',          schedule: 'Daily 9:00 AM IST',    cron: '30 3 * * *' },
  { name: 'followup',         label: 'Follow-Up',         schedule: 'Daily 10:00 AM IST',   cron: '30 4 * * *' },
  { name: 'discovery',        label: 'Discovery',         schedule: 'On email reply',        cron: 'trigger' },
  { name: 'proposal',         label: 'Proposal',          schedule: 'On lead qualified',     cron: 'trigger' },
  { name: 'onboarding',       label: 'Onboarding',        schedule: 'On payment received',   cron: 'trigger' },
  { name: 'invoice',          label: 'Invoice Chase',     schedule: 'Daily 9:00 AM IST',    cron: '30 3 * * *' },
  { name: 'retention',        label: 'Retention',         schedule: 'Sunday 9:30 PM IST',   cron: '0 16 * * 0' },
  { name: 'reporter',         label: 'Reporter',          schedule: 'Daily 8:00 AM IST',    cron: '30 2 * * *' },
  { name: 'kaggle_watchdog',  label: 'Kaggle Watchdog',   schedule: 'Every 30 mins',         cron: '*/30 * * * *' },
  { name: 'supabase_heartbeat', label: 'Supabase Heartbeat', schedule: 'Every 5 days',      cron: '0 12 */5 * *' },
  { name: 'agent_evaluator',  label: 'Agent Evaluator',   schedule: 'Sunday 11:00 PM IST',  cron: '30 17 * * 0' },
  { name: 'coder',            label: 'Coder',             schedule: 'On task assigned',      cron: 'trigger' },
  { name: 'reviewer',         label: 'Reviewer',          schedule: 'On code pushed',        cron: 'trigger' },
  { name: 'tester',           label: 'Tester',            schedule: 'On review passed',      cron: 'trigger' },
  { name: 'debugger',         label: 'Debugger',          schedule: 'On test failure',       cron: 'trigger' },
  { name: 'deployer',         label: 'Deployer',          schedule: 'On tests passed',       cron: 'trigger' },
]

async function seedAgentsIfEmpty(supabase: ReturnType<typeof getServiceSupabase>) {
  const { data } = await supabase.from('agent_rewards').select('agent_name').limit(1)
  if ((data?.length ?? 0) > 0) return // Already seeded

  const seeds = ALL_AGENTS.map(a => ({
    agent_name: a.name,
    current_balance: 100,
    total_earned: 0,
    total_spent: 0,
    success_rate: 100,
    tasks_completed: 0,
    tasks_failed: 0,
    is_suspended: false,
    tier: 'NORMAL',
    created_at: new Date().toISOString()
  }))

  await supabase.from('agent_rewards').insert(seeds)
}

export async function GET() {
  const supabase = getServiceSupabase()

  try {
    await seedAgentsIfEmpty(supabase)

    const [agentsRes, logsRes, gemmaStatusRes] = await Promise.all([
      supabase.from('agent_rewards').select('*').order('current_balance', { ascending: false }),
      supabase.from('agent_logs').select('agent_name, status, action, credits_earned, duration_ms, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('system_config').select('value, updated_at').eq('key', 'gemma_status').single()
    ])

    const agents = agentsRes.data ?? []
    const logs = logsRes.data ?? []

    // Enrich agents with recent performance data
    const enriched = agents.map(agent => {
      const meta = ALL_AGENTS.find(a => a.name === agent.agent_name)
      const agentLogs = logs.filter(l => l.agent_name === agent.agent_name)
      const last24h = agentLogs.filter(l => new Date(l.created_at) > new Date(Date.now() - 86400000))

      return {
        ...agent,
        label: meta?.label ?? agent.agent_name,
        schedule: meta?.schedule ?? 'Unknown',
        cron: meta?.cron ?? '',
        tasks_last_24h: last24h.length,
        success_last_24h: last24h.filter(l => l.status === 'success').length,
        failed_last_24h: last24h.filter(l => l.status === 'failure').length,
        last_log: agentLogs[0] ?? null
      }
    })

    // Any agents not yet in DB (fresh seed may have missed some)
    const inDb = new Set(agents.map(a => a.agent_name))
    const missingMeta = ALL_AGENTS.filter(a => !inDb.has(a.name)).map(a => ({
      agent_name: a.name,
      label: a.label,
      schedule: a.schedule,
      cron: a.cron,
      current_balance: 100,
      total_earned: 0,
      tasks_completed: 0,
      tasks_failed: 0,
      success_rate: 100,
      is_suspended: false,
      tier: 'NORMAL',
      tasks_last_24h: 0,
      success_last_24h: 0,
      failed_last_24h: 0,
      last_log: null
    }))

    const schedules = ALL_AGENTS.filter(a => a.cron !== 'trigger').map(a => ({
      agent: a.name,
      schedule: a.schedule,
      cron: a.cron,
      next_run: getNextRun(a.cron)
    }))

    return NextResponse.json({
      success: true,
      data: {
        agents: [...enriched, ...missingMeta],
        schedules,
        gemma_status: {
          online: !!process.env.GEMMA_API_URL,
          url: process.env.GEMMA_API_URL ? '✅ Configured' : '❌ Not running — start Kaggle notebook',
          last_alive: gemmaStatusRes.data?.updated_at ?? null,
          model: 'Qwen2.5-3B-Instruct (Kaggle GPU)'
        }
      }
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { action, agentName, reason, url } = body

  try {
    if (action === 'suspend') {
      await supabase.from('agent_rewards').update({
        is_suspended: true,
        suspension_reason: reason ?? 'Manual suspension'
      }).eq('agent_name', agentName)

    } else if (action === 'unsuspend') {
      await supabase.from('agent_rewards').update({
        is_suspended: false,
        suspension_reason: null,
        current_balance: 50
      }).eq('agent_name', agentName)

    } else if (action === 'reset_credits') {
      await supabase.from('agent_rewards').update({
        current_balance: 100
      }).eq('agent_name', agentName)

    } else if (action === 'update_gemma_url') {
      await supabase.from('system_config').upsert({
        key: 'gemma_status',
        value: { url, model: 'Qwen2.5-3B-Instruct', status: 'online' },
        description: 'Kaggle AI server URL',
        updated_at: new Date().toISOString()
      })

    } else if (action === 'seed') {
      await seedAgentsIfEmpty(supabase)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

function getNextRun(cron: string): string {
  // Parse simple daily crons: "30 2 * * *" → UTC hour 2 min 30
  const parts = cron.split(' ')
  if (parts.length !== 5) return 'Scheduled'

  const [min, hour, dom] = parts
  if (dom === '*/5') return 'In ~5 days'
  if (cron.includes('*/30')) return 'In ≤30 min'
  if (cron.includes('* 0')) return 'Next Sunday'
  if (cron.includes('* 0 ') || cron.endsWith('0')) return 'Next Sunday'

  const utcH = parseInt(hour)
  const utcM = parseInt(min)
  if (isNaN(utcH)) return 'Scheduled'

  const now = new Date()
  const next = new Date()
  next.setUTCHours(utcH, utcM, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  const hours = Math.floor((next.getTime() - now.getTime()) / 3600000)
  const mins = Math.floor(((next.getTime() - now.getTime()) % 3600000) / 60000)
  return `In ${hours}h ${mins}m`
}
