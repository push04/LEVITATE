/**
 * Revenue API — revenue tracking data
 */

import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const url = new URL(req.url)
  const period = url.searchParams.get('period') ?? '30' // days

  try {
    const daysAgo = new Date(Date.now() - parseInt(period) * 86400000).toISOString()

    const [revenueRes, invoicesRes, projectsRes] = await Promise.all([
      supabase.from('revenue').select('*, clients(business_name, owner_name), projects(name, type)').gte('received_at', daysAgo).order('received_at', { ascending: false }),
      supabase.from('invoices').select('*, clients(business_name), projects(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('projects').select('name, quoted_price, advance_amount, final_amount, advance_paid_at, final_paid_at, status, type, clients(business_name)').order('created_at', { ascending: false }).limit(20)
    ])

    const revenue = revenueRes.data ?? []

    // Daily revenue for chart
    const dailyRevenue: Record<string, number> = {}
    for (let i = 0; i < parseInt(period); i++) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().split('T')[0]
      dailyRevenue[key] = 0
    }
    revenue.forEach(r => {
      const key = r.received_at.split('T')[0]
      if (key in dailyRevenue) dailyRevenue[key] += Number(r.amount)
    })

    // Revenue by type
    const byType: Record<string, number> = {}
    revenue.forEach(r => {
      byType[r.type ?? 'other'] = (byType[r.type ?? 'other'] ?? 0) + Number(r.amount)
    })

    const total = revenue.reduce((s, r) => s + Number(r.amount), 0)
    const avgDeal = revenue.length > 0 ? total / revenue.length : 0

    return NextResponse.json({
      success: true,
      data: {
        total,
        transactions: revenue,
        invoices: invoicesRes.data ?? [],
        projects: projectsRes.data ?? [],
        charts: {
          daily: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })).reverse(),
          by_type: Object.entries(byType).map(([type, amount]) => ({ type, amount }))
        },
        metrics: {
          total_received: total,
          avg_deal_size: Math.round(avgDeal),
          transactions_count: revenue.length,
          pending_invoices: (invoicesRes.data ?? []).filter(i => i.status === 'sent').length,
          pending_amount: (invoicesRes.data ?? []).filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total), 0)
        }
      }
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
