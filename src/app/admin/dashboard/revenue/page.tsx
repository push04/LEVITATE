'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, TrendingUp, Clock, CheckCircle, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface RevenueData {
  total: number
  transactions: Transaction[]
  invoices: Invoice[]
  charts: {
    daily: { date: string; amount: number }[]
    by_type: { type: string; amount: number }[]
  }
  metrics: {
    total_received: number
    avg_deal_size: number
    transactions_count: number
    pending_invoices: number
    pending_amount: number
  }
}

interface Transaction {
  id: string
  amount: number
  type: string
  received_at: string
  clients?: { business_name: string; owner_name: string }
  projects?: { name: string; type: string }
}

interface Invoice {
  id: string
  invoice_number: string
  total: number
  status: string
  due_date: string
  sent_at: string
  clients?: { business_name: string }
  projects?: { name: string }
  reminder_count: number
}

const TYPE_COLORS: Record<string, string> = {
  advance: '#4f9cf9', milestone: '#a78bfa', final: '#22c55e', retainer: '#f59e0b', bonus: '#f43f5e'
}

const PIE_COLORS = ['#4f9cf9', '#a78bfa', '#22c55e', '#f59e0b', '#f43f5e']

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [period, setPeriod] = useState('30')
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/revenue?period=${period}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (err) {
      console.error('Revenue load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  const statusColor = (status: string) => {
    if (status === 'paid') return 'text-emerald-700 bg-emerald-50 border border-emerald-200'
    if (status === 'overdue') return 'text-red-700 bg-red-50 border border-red-200'
    if (status === 'sent') return 'text-amber-700 bg-amber-50 border border-amber-200'
    return 'text-gray-600 bg-gray-100 border border-gray-200'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
            <IndianRupee className="w-7 h-7 text-emerald-600" />
            Revenue Dashboard
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">All money flowing through Levitate Labs</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Received', value: fmt(data.metrics.total_received), icon: CheckCircle, color: 'text-emerald-600' },
              { label: 'Avg Deal Size', value: fmt(data.metrics.avg_deal_size), icon: TrendingUp, color: 'text-blue-600' },
              { label: 'Transactions', value: data.metrics.transactions_count, icon: BarChart3, color: 'text-violet-600' },
              { label: 'Pending Invoices', value: data.metrics.pending_invoices, icon: Clock, color: 'text-amber-600' },
              { label: 'Pending Amount', value: fmt(data.metrics.pending_amount), icon: AlertTriangle, color: 'text-red-600' }
            ].map((m) => (
              <motion.div key={m.label} whileHover={{ scale: 1.02 }} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                  <span className="text-xs text-[var(--muted)]">{m.label}</span>
                </div>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Revenue Chart */}
            <div className="md:col-span-2 glass-card p-5">
              <h3 className="font-semibold mb-4 text-sm text-[var(--muted)]">Daily Revenue (₹)</h3>
              <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={200}>
                <BarChart data={data.charts.daily.slice(-30)}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.charts.daily.length / 6)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `₹${v / 1000}k` : `₹${v}`} />
                  <Tooltip formatter={(v: number | undefined) => [`₹${(v ?? 0).toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#111827' }} />
                  <Bar dataKey="amount" fill="#4f9cf9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue by Type */}
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-4 text-sm text-[var(--muted)]">Revenue by Type</h3>
              {data.charts.by_type.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={150}>
                    <PieChart>
                      <Pie data={data.charts.by_type} dataKey="amount" nameKey="type" cx="50%" cy="50%" outerRadius={60}>
                        {data.charts.by_type.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => `₹${(v ?? 0).toLocaleString('en-IN')}`} contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#111827' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {data.charts.by_type.map((item, i) => (
                      <div key={item.type} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="capitalize text-[var(--muted)]">{item.type}</span>
                        </div>
                        <span className="font-medium">{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-[var(--muted)] text-sm">No data yet</div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-4">Recent Transactions</h3>
            {data.transactions.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No transactions yet. First payment will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.transactions.slice(0, 20).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--secondary)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{txn.clients?.business_name ?? 'Unknown Client'}</p>
                        <p className="text-xs text-[var(--muted)]">{txn.projects?.name ?? ''} · {new Date(txn.received_at).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">{fmt(txn.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[txn.type] ? 'text-white' : ''}`}
                        style={{ background: TYPE_COLORS[txn.type] ?? '#64748b' }}>
                        {txn.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-4">Invoices</h3>
            {data.invoices.length === 0 ? (
              <p className="text-[var(--muted)] text-sm text-center py-4">No invoices yet</p>
            ) : (
              <div className="space-y-2">
                {data.invoices.slice(0, 15).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--secondary)] border border-[var(--border)]">
                    <div>
                      <p className="text-sm font-medium">#{inv.invoice_number} · {inv.clients?.business_name}</p>
                      <p className="text-xs text-[var(--muted)]">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '-'} · Reminders: {inv.reminder_count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{fmt(inv.total)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(inv.status)}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
