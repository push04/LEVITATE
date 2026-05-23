/**
 * Agent Management API
 * GET: All agent status + rewards (auto-seeds if table is empty)
 * POST: Suspend/unsuspend/reset/update_gemma_url
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

const ALL_AGENTS = [
  { name: 'bizdev',           label: 'BizDev',           schedule: 'Every 2 hours',         cron: '0 */2 * * *' },
  { name: 'research',         label: 'Research',          schedule: 'Every 15 mins',         cron: '*/15 * * * *' },
  { name: 'outreach',         label: 'Outreach',          schedule: 'Every 15 mins',         cron: '*/15 * * * *' },
  { name: 'followup',         label: 'Follow-Up',         schedule: 'Every 15 mins',         cron: '*/15 * * * *' },
  { name: 'discovery',        label: 'Discovery',         schedule: 'On email reply',        cron: 'trigger' },
  { name: 'proposal',         label: 'Proposal',          schedule: 'On lead qualified',     cron: 'trigger' },
  { name: 'onboarding',       label: 'Onboarding',        schedule: 'On payment received',   cron: 'trigger' },
  { name: 'invoice',          label: 'Invoice Chase',     schedule: 'Every 30 mins',         cron: '*/30 * * * *' },
  { name: 'retention',        label: 'Retention',         schedule: 'Every 12 hours',        cron: '0 */12 * * *' },
  { name: 'reporter',         label: 'Reporter',          schedule: 'Every 30 mins',         cron: '*/30 * * * *' },
  { name: 'supabase_heartbeat', label: 'Supabase Heartbeat', schedule: 'Daily',             cron: '0 0 * * *' },
  { name: 'agent_evaluator',  label: 'Agent Evaluator',   schedule: 'Every 6 hours',         cron: '0 */6 * * *' },
  { name: 'architect',        label: 'Architect',         schedule: 'On project start',      cron: 'trigger' },
  { name: 'coder',            label: 'Coder',             schedule: 'On task assigned',      cron: 'trigger' },
  { name: 'reviewer',         label: 'Reviewer',          schedule: 'On code pushed',        cron: 'trigger' },
  { name: 'tester',           label: 'Tester',            schedule: 'On review passed',        cron: 'trigger' },
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
          online: true,
          url: 'Private Server + Fallback',
          last_alive: gemmaStatusRes.data?.updated_at ?? null,
          model: 'llama-3.3-70b-versatile'
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

    } else if (action === 'trigger') {
      const triggerUrls: Record<string, string> = {
        reporter: '/api/reporter/trigger',
        research: '/api/research/trigger',
        outreach: '/api/outreach/trigger',
        followup: '/api/followup/trigger',
        bizdev: '/api/bizdev/trigger',
        invoice: '/api/invoice/trigger',
        retention: '/api/retention/trigger',
        agent_evaluator: '/api/agent-evaluator/trigger'
      }
      
      const triggerUrl = triggerUrls[agentName]
      if (triggerUrl) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://levitatelabs.online'}${triggerUrl}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (err) {
          console.error(`Failed to trigger ${agentName}:`, err)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

function getNextRun(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length !== 5) return 'Scheduled'

  const [minPart, hourPart] = parts
  const now = new Date()

  // Every N minutes: */N * * * *
  const everyNMin = minPart.match(/^\*\/(\d+)$/)
  if (everyNMin && hourPart === '*') {
    const n = parseInt(everyNMin[1])
    const currentMin = now.getMinutes()
    const nextMin = Math.ceil((currentMin + 1) / n) * n
    const wait = nextMin - currentMin
    return `In ≤${n} min`
  }

  // Every N hours: 0 */N * * *
  const everyNHour = hourPart.match(/^\*\/(\d+)$/)
  if (everyNHour && minPart === '0') {
    const n = parseInt(everyNHour[1])
    return `In ≤${n}h`
  }

  // Specific daily time: M H * * *
  const utcH = parseInt(hourPart)
  const utcM = parseInt(minPart)
  if (!isNaN(utcH) && !isNaN(utcM)) {
    const next = new Date()
    next.setUTCHours(utcH, utcM, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    const diffMs = next.getTime() - now.getTime()
    const hours = Math.floor(diffMs / 3600000)
    const mins = Math.floor((diffMs % 3600000) / 60000)
    return hours > 0 ? `In ${hours}h ${mins}m` : `In ${mins}m`
  }

  return 'Scheduled'
}
