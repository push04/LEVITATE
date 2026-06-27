'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, MapPin, Tag, Phone, Globe, Database,
  TrendingUp, CheckCircle2, Clock, MessageSquare,
  Loader2, AlertCircle, Target, Activity,
} from 'lucide-react'

interface Stats {
  summary: { total: number; withPhone: number; withWebsite: number; gmaps: number; justdial: number }
  targets: { total: number; active: number; covered: number }
  topCities: { city: string; count: number }[]
  topCategories: { category: string; count: number }[]
  trend: { date: string; count: number }[]
  recentLogs: { id: string; status: string; inserted: number; skipped: number; errors: number; created_at: string }[]
  whatsapp: { sent: number; pending: number; total: number }
}

function StatCard({ label, value, sub, icon: Icon, accent = '#B08D57' }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="mt-0.5 text-[12px] text-gray-400">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${accent}18` }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
    </motion.div>
  )
}

function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-[12px] text-gray-600 text-right">{label}</span>
      <div className="flex-1 rounded-full bg-gray-100 h-2">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-10 text-right text-[12px] font-semibold text-gray-700">{count}</span>
    </div>
  )
}

function TrendChart({ trend }: { trend: { date: string; count: number }[] }) {
  const max = Math.max(...trend.map(t => t.count), 1)
  return (
    <div className="flex items-end gap-1 h-20">
      {trend.map((t, i) => {
        const h = Math.max((t.count / max) * 100, t.count > 0 ? 4 : 0)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-sm bg-[#B08D57]/70 hover:bg-[#B08D57] transition-colors cursor-default"
              style={{ height: `${h}%`, minHeight: t.count > 0 ? 4 : 0 }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
              {t.date}: {t.count}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cfg = status === 'success'
    ? 'bg-green-50 text-green-700 border-green-200'
    : status === 'partial'
    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg}`}>{status}</span>
}

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function BizHarvestAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/bizharvest')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStats(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#B08D57]" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-400">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">{error ?? 'Failed to load'}</p>
        <button onClick={() => load()} className="text-[#B08D57] text-sm hover:underline">Retry</button>
      </div>
    )
  }

  const { summary, targets, topCities, topCategories, trend, recentLogs, whatsapp } = stats
  const phoneRate = summary.total > 0 ? Math.round((summary.withPhone / summary.total) * 100) : 0
  const coverage = targets.active > 0 ? Math.round((targets.covered / targets.active) * 100) : 0
  const maxCity = topCities[0]?.count ?? 1
  const maxCat = topCategories[0]?.count ?? 1

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BizHarvest Analytics</h1>
          <p className="mt-0.5 text-[13px] text-gray-400">Local scraper — Google Maps + JustDial lead pipeline</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Leads" value={summary.total} sub="across all sources" icon={Database} />
        <StatCard label="With Phone" value={`${summary.withPhone.toLocaleString()} (${phoneRate}%)`} sub="contactable leads" icon={Phone} accent="#16a34a" />
        <StatCard label="Google Maps" value={summary.gmaps} sub="gmaps source" icon={MapPin} accent="#2563eb" />
        <StatCard label="JustDial" value={summary.justdial} sub="justdial source" icon={Globe} accent="#7c3aed" />
      </div>

      {/* Target + WhatsApp row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-[#B08D57]" />
            <p className="text-[13px] font-semibold text-gray-700">Scrape Targets</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Total targets</span>
              <span className="font-bold text-gray-900">{targets.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Active</span>
              <span className="font-bold text-green-600">{targets.active.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Scraped so far</span>
              <span className="font-bold text-[#B08D57]">{targets.covered} ({coverage}%)</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-[#B08D57] transition-all" style={{ width: `${coverage}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <p className="text-[13px] font-semibold text-gray-700">WhatsApp Queue</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Sent</span>
              <span className="font-bold text-green-600">{whatsapp.sent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Pending</span>
              <span className="font-bold text-yellow-600">{whatsapp.pending.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Total queued</span>
              <span className="font-bold text-gray-900">{whatsapp.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-blue-500" />
            <p className="text-[13px] font-semibold text-gray-700">Lead Quality</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">With phone</span>
              <span className="font-bold text-gray-900">{summary.withPhone.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">With website</span>
              <span className="font-bold text-gray-900">{summary.withWebsite.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Phone rate</span>
              <span className={`font-bold ${phoneRate >= 70 ? 'text-green-600' : phoneRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                {phoneRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-[#B08D57]" />
          <p className="text-[13px] font-semibold text-gray-700">Leads scraped — last 14 days</p>
        </div>
        {trend.every(t => t.count === 0) ? (
          <div className="flex h-20 items-center justify-center text-[13px] text-gray-400">No data yet — run BizHarvest to see trend</div>
        ) : (
          <>
            <TrendChart trend={trend} />
            <div className="mt-2 flex justify-between text-[10px] text-gray-400">
              <span>{trend[0]?.date}</span>
              <span>{trend[trend.length - 1]?.date}</span>
            </div>
          </>
        )}
      </div>

      {/* Top cities + categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-[#B08D57]" />
            <p className="text-[13px] font-semibold text-gray-700">Top Cities</p>
          </div>
          {topCities.length === 0 ? (
            <p className="text-[13px] text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCities.map(({ city, count }) => (
                <HBar key={city} label={city} count={count} max={maxCity} color="#B08D57" />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-4 w-4 text-purple-500" />
            <p className="text-[13px] font-semibold text-gray-700">Top Categories</p>
          </div>
          {topCategories.length === 0 ? (
            <p className="text-[13px] text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(({ category, count }) => (
                <HBar key={category} label={category} count={count} max={maxCat} color="#7c3aed" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent agent logs */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-700">Recent Scrape Runs</p>
        </div>
        {recentLogs.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-[13px] text-gray-400">
            No runs logged yet — double-click Run_BizHarvest.bat to start
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-left">
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Inserted</th>
                  <th className="pb-2 font-semibold">Skipped</th>
                  <th className="pb-2 font-semibold">Errors</th>
                  <th className="pb-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-2"><StatusPill status={log.status} /></td>
                    <td className="py-2 font-medium text-green-600">+{log.inserted}</td>
                    <td className="py-2 text-gray-400">{log.skipped}</td>
                    <td className="py-2 text-red-400">{log.errors}</td>
                    <td className="py-2 text-gray-400">{timeAgo(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
