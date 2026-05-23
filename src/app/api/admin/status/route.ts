import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()
  
  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    
    const [
      logsRes, 
      leadsRes, 
      revenueRes, 
      agentsRes,
      recentLogsRes,
      leadsTodayRes,
      leadsThisWeekRes,
      creditsByAgentRes
    ] = await Promise.all([
      supabase.from('agent_logs')
        .select('agent_name, action, status, credits_earned, created_at, duration_ms, output')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('leads').select('status'),
      supabase.from('revenue').select('amount, type, received_at'),
      supabase.from('agent_rewards').select('*'),
      supabase.from('agent_logs')
        .select('agent_name, action, status, credits_earned, created_at, output')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('agent_logs')
        .select('agent_name, credits_earned')
        .gte('created_at', oneDayAgo)
    ])
    
    const leadsByStatus = (leadsRes.data ?? []).reduce((acc: Record<string, number>, l: { status: string }) => {
      const status = l.status ?? 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}) ?? {}
    
    const totalRevenue = (revenueRes.data ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0) ?? 0
    
    const recentActivity = (recentLogsRes.data ?? []).reduce((acc: Record<string, { count: number; success: number; failed: number }>, l: { agent_name: string; status: string }) => {
      if (!acc[l.agent_name]) {
        acc[l.agent_name] = { count: 0, success: 0, failed: 0 }
      }
      acc[l.agent_name].count++
      if (l.status === 'success') acc[l.agent_name].success++
      else if (l.status === 'failure') acc[l.agent_name].failed++
      return acc
    }, {} as Record<string, { count: number; success: number; failed: number }>) ?? {}
    
    const creditsByAgent = (creditsByAgentRes.data ?? []).reduce((acc: Record<string, number>, l: { agent_name: string; credits_earned: number }) => {
      acc[l.agent_name] = (acc[l.agent_name] || 0) + l.credits_earned
      return acc
    }, {} as Record<string, number>) ?? {}
    
    const lastRunByAgent = (logsRes.data ?? []).reduce((acc: Record<string, { time: string; action: string; status: string }>, l: { agent_name: string; created_at: string; action: string; status: string }) => {
      if (!acc[l.agent_name]) {
        acc[l.agent_name] = { time: l.created_at, action: l.action, status: l.status }
      }
      return acc
    }, {} as Record<string, { time: string; action: string; status: string }>) ?? {}
    
    const allAgentNames = [
      'reporter', 'research', 'outreach', 'followup', 'bizdev', 'invoice', 'retention', 
      'agent_evaluator', 'supabase_heartbeat', 'discovery', 'proposal', 'onboarding',
      'architect', 'coder', 'reviewer', 'tester', 'debugger', 'deployer'
    ]
    
    const agentStatuses = allAgentNames.map(name => {
      const dbAgent = (agentsRes.data ?? []).find((a: { agent_name: string }) => a.agent_name === name)
      const activity = recentActivity[name] ?? { count: 0, success: 0, failed: 0 }
      const lastRun = lastRunByAgent[name]
      const creditsEarnedToday = creditsByAgent[name] ?? 0
      
      return {
        name,
        label: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        credits: dbAgent?.current_balance ?? 100,
        suspended: dbAgent?.is_suspended ?? false,
        tasks_today: activity.count,
        tasks_success: activity.success,
        tasks_failed: activity.failed,
        credits_today: creditsEarnedToday,
        last_run: lastRun?.time || null,
        last_action: lastRun?.action || null,
        last_status: lastRun?.status || null,
        is_active: activity.count > 0
      }
    })
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        total_revenue: totalRevenue,
        leads_by_status: leadsByStatus,
        total_leads: (leadsRes.data ?? []).length,
        leads_today: leadsTodayRes.count ?? 0,
        leads_this_week: leadsThisWeekRes.count ?? 0,
        active_agents_last_hour: Object.keys(recentActivity).length,
        total_tasks_today: Object.values(recentActivity).reduce((s, a) => s + a.count, 0),
        total_credits_earned_today: Object.values(creditsByAgent).reduce((s, c) => s + c, 0)
      },
      agents: agentStatuses,
      recent_activity: (recentLogsRes.data ?? []).slice(0, 10).map(l => ({
        agent: l.agent_name,
        action: l.action,
        status: l.status,
        credits: l.credits_earned,
        time: l.created_at,
        output: l.output
      })),
      leads_by_status: leadsByStatus,
      revenue: {
        total: totalRevenue,
        recent: (revenueRes.data ?? []).slice(0, 5).map(r => ({
          amount: Number(r.amount),
          type: r.type,
          date: r.received_at
        }))
      }
    })
  } catch (err) {
    console.error('[Admin Status] Error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
