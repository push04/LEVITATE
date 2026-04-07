/**
 * Agent Management API
 * GET: All agent status + rewards
 * POST: Suspend/unsuspend/reset agent
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  try {
    const [agentsRes, logsRes, gemmaStatusRes] = await Promise.all([
      supabase.from('agent_rewards').select('*').order('current_balance', { ascending: false }),
      supabase.from('agent_logs').select('agent_name, status, action, credits_earned, duration_ms, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('system_config').select('value, updated_at').eq('key', 'gemma_status').single()
    ])

    const agents = agentsRes.data ?? []
    const logs = logsRes.data ?? []

    // Enrich agents with recent performance data
    const enriched = agents.map(agent => {
      const agentLogs = logs.filter(l => l.agent_name === agent.agent_name)
      const last24h = agentLogs.filter(l => new Date(l.created_at) > new Date(Date.now() - 86400000))
      const successLast24h = last24h.filter(l => l.status === 'success').length
      const failedLast24h = last24h.filter(l => l.status === 'failure').length

      return {
        ...agent,
        tasks_last_24h: last24h.length,
        success_last_24h: successLast24h,
        failed_last_24h: failedLast24h,
        last_log: agentLogs[0]
      }
    })

    const schedules = [
      { agent: 'reporter', schedule: 'Daily 8:00 AM IST', cron: '30 2 * * *', next_run: getNextRun(2, 30) },
      { agent: 'bizdev', schedule: 'Daily 6:00 AM IST', cron: '30 0 * * *', next_run: getNextRun(0, 30) },
      { agent: 'outreach', schedule: 'Daily 9:00 AM IST', cron: '30 3 * * *', next_run: getNextRun(3, 30) },
      { agent: 'followup', schedule: 'Daily 10:00 AM IST', cron: '30 4 * * *', next_run: getNextRun(4, 30) },
      { agent: 'invoice', schedule: 'Daily 9:00 AM IST', cron: '30 3 * * *', next_run: getNextRun(3, 30) },
      { agent: 'retention', schedule: 'Sunday 9:30 PM IST', cron: '0 16 * * 0', next_run: 'Next Sunday 9:30 PM' },
      { agent: 'agent_evaluator', schedule: 'Sunday 11:00 PM IST', cron: '30 17 * * 0', next_run: 'Next Sunday 11:00 PM' },
      { agent: 'kaggle_watchdog', schedule: 'Every 30 mins', cron: '*/30 * * * *', next_run: 'In ≤30 min' },
      { agent: 'supabase_heartbeat', schedule: 'Every 5 days', cron: '0 12 */5 * *', next_run: 'In 5 days' }
    ]

    return NextResponse.json({
      success: true,
      data: {
        agents: enriched,
        schedules,
        gemma_status: {
          url: process.env.GEMMA_API_URL ? '✅ Configured' : '❌ Not set',
          last_alive: gemmaStatusRes.data?.updated_at,
          model: 'Gemma 4 (Kaggle GPU)'
        }
      }
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = getServiceSupabase()
  const { action, agentName, reason } = await req.json()

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
        current_balance: 50 // Give fresh start credits
      }).eq('agent_name', agentName)
    } else if (action === 'reset_credits') {
      await supabase.from('agent_rewards').update({
        current_balance: 100
      }).eq('agent_name', agentName)
    } else if (action === 'update_gemma_url') {
      const { url } = await req.json()
      await supabase.from('system_config').upsert({
        key: 'gemma_api_url',
        value: { url },
        description: 'Kaggle Gemma 4 API URL (ngrok tunnel)',
        updated_at: new Date().toISOString()
      })
      // Update the env won't work at runtime, but we store it for reference
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

function getNextRun(utcHour: number, utcMinute: number): string {
  const now = new Date()
  const next = new Date()
  next.setUTCHours(utcHour, utcMinute, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  const hours = Math.floor((next.getTime() - now.getTime()) / 3600000)
  const mins = Math.floor(((next.getTime() - now.getTime()) % 3600000) / 60000)
  return `In ${hours}h ${mins}m`
}
