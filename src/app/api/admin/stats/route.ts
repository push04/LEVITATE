/**
 * Admin Stats API — Dashboard data endpoint
 */

import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  try {
    const [
      leadsRes, projectsRes, todayRevenueRes, monthRevenueRes,
      totalRevenueRes, pendingRevenueRes, agentRes, tasksRes, logsRes
    ] = await Promise.all([
      supabase.from('leads').select('status, score, business_name, city, created_at, outreach_count').order('created_at', { ascending: false }).limit(100),
      supabase.from('projects').select('status, name, type, advance_amount, final_amount, staging_url, clients(business_name)').order('created_at', { ascending: false }),
      supabase.from('revenue').select('amount').gte('received_at', today.toISOString()),
      supabase.from('revenue').select('amount').gte('received_at', monthStart.toISOString()),
      supabase.from('revenue').select('amount'),
      supabase.from('invoices').select('total').eq('status', 'sent'),
      supabase.from('agent_rewards').select('*').order('current_balance', { ascending: false }),
      supabase.from('tasks').select('status, type').neq('status', 'done'),
      supabase.from('agent_logs').select('agent_name, action, status, credits_earned, duration_ms, ai_provider, created_at').order('created_at', { ascending: false }).limit(50)
    ])

    const leads = leadsRes.data ?? []
    const sumRevenue = (arr: { amount: unknown }[]) => arr.reduce((s, r) => s + Number(r.amount), 0)
    const sumField = (arr: Record<string, unknown>[], field: string) => arr.reduce((s, r) => s + Number(r[field] ?? 0), 0)

    const stats = {
      // Revenue
      todayRevenue: sumRevenue(todayRevenueRes.data ?? []),
      monthRevenue: sumRevenue(monthRevenueRes.data ?? []),
      totalRevenue: sumRevenue(totalRevenueRes.data ?? []),
      pendingRevenue: sumField(pendingRevenueRes.data ?? [], 'total'),

      // Lead funnel
      leadsTotal: leads.length,
      leadsNew: leads.filter(l => l.status === 'new').length,
      leadsContacted: leads.filter(l => l.status === 'contacted').length,
      leadsReplied: leads.filter(l => l.status === 'replied').length,
      leadsQualified: leads.filter(l => l.status === 'qualified').length,
      proposalsSent: leads.filter(l => l.status === 'proposal_sent').length,
      dealsWon: leads.filter(l => l.status === 'won').length,
      dealsLost: leads.filter(l => l.status === 'lost').length,

      // Projects
      projectsActive: (projectsRes.data ?? []).filter(p => !['delivered', 'closed'].includes(p.status)).length,
      projectsDelivered: (projectsRes.data ?? []).filter(p => p.status === 'delivered').length,

      // System health
      systemHealth: (() => {
        const suspended = (agentRes.data ?? []).filter(a => a.is_suspended).length
        const failedTasks = (tasksRes.data ?? []).filter(t => t.status === 'escalated').length
        if (suspended > 2 || failedTasks > 3) return 'red'
        if (suspended > 0 || failedTasks > 0) return 'yellow'
        return 'green'
      })(),

      // Recent data
      recentActivity: logsRes.data ?? [],
      activeProjects: projectsRes.data?.filter(p => !['delivered', 'closed'].includes(p.status)) ?? [],
      hotLeads: leads.filter(l => l.score >= 6 && ['new', 'contacted'].includes(l.status)).slice(0, 10),
      agentStatus: agentRes.data ?? [],
      taskQueue: tasksRes.data ?? []
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (err) {
    console.error('[Admin Stats] Error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
