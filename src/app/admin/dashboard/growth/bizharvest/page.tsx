'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, MapPin, Tag, Phone, Database,
  TrendingUp, CheckCircle2, MessageSquare,
  Loader2, AlertCircle, Target, Activity, Star,
  Sparkles, Users, Search, ExternalLink, Send,
  FileText, FileSpreadsheet, FileDown, Trash2,
} from 'lucide-react'
import { exportLeadsCSV, exportLeadsXLSX, exportLeadsPDF } from '@/lib/bizharvest-export'

interface RecentLead {
  id: string
  name: string
  city: string | null
  category: string | null
  phone: string | null
  website: string | null
  status: string
  rating: number | null
  reviewCount: number | null
  dealValue: number | null
  source: string
  createdAt: string
}

interface TopRated {
  id: string
  name: string
  city: string | null
  category: string | null
  rating?: number
  reviewCount: number
  phone: string | null
  source: string
}

interface Stats {
  summary: {
    total: number; withPhone: number; withWebsite: number; gmaps: number; justdial: number
    distinctCities: number; distinctCategories: number; avgRating: number
  }
  targets: { total: number; active: number; covered: number }
  topCities: { city: string; count: number }[]
  topCategories: { category: string; count: number }[]
  trend: { date: string; count: number }[]
  recentLogs: { id: string; status: string; inserted: number; skipped: number; errors: number; created_at: string }[]
  whatsapp: { queued: number }
  pipeline: Record<string, number>
  ratings: { average: number; rated: number; distribution: { bucket: string; count: number }[]; topRated: TopRated[] }
  recentLeads: RecentLead[]
}

function StatCard({ label, value, sub, icon: Icon, accent = '#B08D57' }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-gray-400 truncate">{label}</p>
          <p className="mt-1 text-xl sm:text-3xl font-bold text-gray-900 truncate">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="mt-0.5 text-[11px] sm:text-[12px] text-gray-400 truncate">{sub}</p>}
        </div>
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}18` }}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: accent }} />
        </div>
      </div>
    </motion.div>
  )
}

function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="w-20 sm:w-36 shrink-0 truncate text-[12px] text-gray-600 text-right">{label}</span>
      <div className="flex-1 rounded-full bg-gray-100 h-2">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-8 sm:w-10 text-right text-[12px] font-semibold text-gray-700">{count}</span>
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

function LeadStatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    New: 'bg-blue-50 text-blue-700 border-blue-200',
    Contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Follow Up': 'bg-purple-50 text-purple-700 border-purple-200',
    Closed: 'bg-green-50 text-green-700 border-green-200',
  }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{status}</span>
}

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const PIPELINE_ORDER = ['New', 'Contacted', 'Follow Up', 'Closed']
const PIPELINE_COLOR: Record<string, string> = {
  New: '#2563eb', Contacted: '#eab308', 'Follow Up': '#7c3aed', Closed: '#16a34a',
}

interface ChatLead {
  id: string
  name: string
  city: string | null
  category: string | null
  phone: string | null
  website: string | null
  status: string
  rating: number | null
  reviewCount: number | null
  dealValue: number | null
  source: string
  createdAt: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  leads?: ChatLead[]
  total?: number
  truncated?: boolean
  error?: boolean
}

const CHAT_EXAMPLES = [
  'restaurants in Patna with phone numbers',
  'top rated clinics in Vadodara',
  'CA firms in Ahmedabad without a website',
  'all salons, sorted by rating',
]

function ChatResultsTable({ leads, query, onDeleted }: { leads: ChatLead[]; query: string; onDeleted: (ids: string[]) => void }) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [showSendPanel, setShowSendPanel] = useState(false)
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ queued: number; skipped: number } | null>(null)
  const [sendErr, setSendErr] = useState('')
  const filenameBase = `bizharvest_${query.replace(/[^a-z0-9]+/gi, '_').toLowerCase().slice(0, 40).replace(/^_+|_+$/g, '') || 'leads'}_${new Date().toISOString().slice(0, 10)}`
  const visible = leads.slice(0, 100)
  const allVisibleSelected = visible.length > 0 && visible.every(l => selected.has(l.id))
  const targetLeads = selected.size > 0 ? leads.filter(l => selected.has(l.id)) : leads
  const sendableCount = targetLeads.filter(l => l.phone).length

  const handleExport = async (fmt: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(fmt)
    try {
      if (fmt === 'csv') await exportLeadsCSV(leads, filenameBase)
      else if (fmt === 'xlsx') await exportLeadsXLSX(leads, filenameBase)
      else await exportLeadsPDF(leads, filenameBase, `BizHarvest — ${query}`)
    } finally {
      setExporting(null)
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) visible.forEach(l => next.delete(l.id))
      else visible.forEach(l => next.add(l.id))
      return next
    })
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} lead${selected.size === 1 ? '' : 's'} from the database? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const ids = Array.from(selected)
      const res = await fetch('/api/admin/bizharvest/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onDeleted(ids)
      setSelected(new Set())
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete leads')
    } finally {
      setDeleting(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (!sendMessage.trim() || sendableCount === 0) return
    setSending(true)
    setSendErr('')
    try {
      const contacts = targetLeads
        .filter(l => l.phone)
        .map(l => ({ phone: l.phone as string, name: l.name }))
      const res = await fetch('/api/admin/whatsapp/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, message: sendMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSendResult({ queued: data.queued, skipped: data.skipped })
    } catch (e: any) {
      setSendErr(e.message ?? 'Failed to queue messages')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-500">{leads.length} result{leads.length === 1 ? '' : 's'}</span>
          {selected.size > 0 && (
            <>
              <span className="text-[11px] text-[#B08D57] font-semibold">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())} className="text-[11px] text-gray-400 hover:text-gray-600">Clear</button>
            </>
          )}
          {selected.size < leads.length && (
            <button onClick={() => setSelected(new Set(leads.map(l => l.id)))} className="text-[11px] text-gray-400 hover:text-[#B08D57]">
              Select all {leads.length}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {selected.size > 0 && (
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1 text-[11px] rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-red-600 hover:bg-red-100 disabled:opacity-40">
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete {selected.size}
            </button>
          )}
          {sendableCount > 0 && (
            <button
              onClick={() => { setShowSendPanel(v => !v); setSendResult(null); setSendErr('') }}
              className={`flex items-center gap-1 text-[11px] rounded-lg border px-2 py-1 ${showSendPanel ? 'border-green-300 bg-green-100 text-green-700' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}
            >
              <MessageSquare className="h-3 w-3" /> Send WhatsApp ({sendableCount})
            </button>
          )}
          <button onClick={() => handleExport('csv')} disabled={!!exporting} className="flex items-center gap-1 text-[11px] rounded-lg border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {exporting === 'csv' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} CSV
          </button>
          <button onClick={() => handleExport('xlsx')} disabled={!!exporting} className="flex items-center gap-1 text-[11px] rounded-lg border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {exporting === 'xlsx' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />} Excel
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="flex items-center gap-1 text-[11px] rounded-lg border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {exporting === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />} PDF
          </button>
        </div>
      </div>
      {showSendPanel && (
        <div className="px-3 py-3 border-b border-gray-100 bg-green-50/40 space-y-2">
          {sendResult ? (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                {sendResult.queued.toLocaleString()} message{sendResult.queued === 1 ? '' : 's'} queued
                {sendResult.skipped > 0 && ` (${sendResult.skipped} skipped — invalid numbers)`}.
                {' '}Check the WhatsApp Bridge page to track sending.
              </p>
              <button onClick={() => { setShowSendPanel(false); setSendResult(null); setSendMessage('') }} className="text-[11px] text-gray-500 hover:text-gray-700">Close</button>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-gray-500">
                Will queue a WhatsApp message to <strong>{sendableCount}</strong> of {targetLeads.length} {selected.size > 0 ? 'selected' : 'matching'} lead{targetLeads.length === 1 ? '' : 's'} that have a phone number.
                {targetLeads.length - sendableCount > 0 && ` ${targetLeads.length - sendableCount} skipped (no phone).`}
              </p>
              <textarea
                value={sendMessage}
                onChange={e => setSendMessage(e.target.value)}
                rows={3}
                placeholder="Hi {{name}}, this is from Levitate…"
                className="w-full text-[12px] rounded-lg border border-gray-200 px-2.5 py-2 outline-none focus:border-green-500 resize-none"
              />
              {sendErr && <p className="text-[11px] text-red-500">{sendErr}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowSendPanel(false)} className="text-[11px] px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100">Cancel</button>
                <button
                  onClick={handleSendWhatsApp}
                  disabled={sending || !sendMessage.trim()}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                  {sending ? 'Queuing…' : `Queue ${sendableCount} message${sendableCount === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="max-h-64 overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[480px] text-[12px]">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="px-3 py-1.5 font-semibold w-8">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="rounded border-gray-300" />
              </th>
              <th className="px-3 py-1.5 font-semibold">Name</th>
              <th className="px-3 py-1.5 font-semibold">Phone</th>
              <th className="px-3 py-1.5 font-semibold">City</th>
              <th className="px-3 py-1.5 font-semibold">Rating</th>
              <th className="px-3 py-1.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(l => (
              <tr key={l.id} className={`text-gray-700 ${selected.has(l.id) ? 'bg-[#B08D57]/5' : ''}`}>
                <td className="px-3 py-1.5">
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleOne(l.id)} className="rounded border-gray-300" />
                </td>
                <td className="px-3 py-1.5 max-w-[160px] truncate">{l.name}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{l.phone || '—'}</td>
                <td className="px-3 py-1.5">{l.city || '—'}</td>
                <td className="px-3 py-1.5">{l.rating ? `${l.rating} ★` : '—'}</td>
                <td className="px-3 py-1.5"><LeadStatusPill status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length > 100 && (
          <p className="px-3 py-2 text-[11px] text-gray-400">Showing first 100 in preview — export or "select all" covers the full {leads.length}.</p>
        )}
      </div>
    </div>
  )
}

function BizHarvestChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bizharvest/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, leads: data.leads, total: data.total, truncated: data.truncated }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: e.message ?? 'Something went wrong.', error: true }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  const handleDeleted = useCallback((msgIndex: number, ids: string[]) => {
    setMessages(prev => prev.map((m, idx) => {
      if (idx !== msgIndex || !m.leads) return m
      const remaining = m.leads.filter(l => !ids.includes(l.id))
      return { ...m, leads: remaining, total: Math.max(0, (m.total ?? remaining.length) - ids.length) }
    }))
  }, [])

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Sparkles className="h-4 w-4 text-[#B08D57]" />
        <p className="text-[13px] font-semibold text-gray-700">Ask BizHarvest</p>
        <span className="text-[11px] text-gray-400 hidden sm:inline">— ask for leads in plain English, export or curate the results</span>
      </div>

      <div ref={scrollRef} className="max-h-[420px] overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[13px] text-gray-400">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {CHAT_EXAMPLES.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-[12px] rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-[#B08D57] hover:text-[#B08D57]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`rounded-2xl px-4 py-2.5 text-[13px] ${m.leads?.length ? 'max-w-full sm:max-w-[85%]' : 'max-w-[90%] sm:max-w-[85%]'} ${
              m.role === 'user' ? 'bg-[#B08D57] text-white' : m.error ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-700'
            }`}>
              <p className="whitespace-pre-line">{m.content}</p>
              {m.leads && m.leads.length > 0 && (
                <ChatResultsTable leads={m.leads} query={messages[i - 1]?.content ?? 'leads'} onDeleted={ids => handleDeleted(i, ids)} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-50 px-4 py-2.5 text-[13px] text-gray-400 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching leads...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={e => { e.preventDefault(); send(input) }}
        className="flex items-center gap-2 border-t border-gray-100 px-4 py-3"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='e.g. "I need all restaurant leads in Patna"'
          className="flex-1 text-[13px] rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-[#B08D57] px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </form>
    </div>
  )
}

export default function BizHarvestAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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

  const filteredLeads = useMemo(() => {
    if (!stats) return []
    const q = search.trim().toLowerCase()
    return stats.recentLeads.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      if (!q) return true
      return (
        l.name?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.category?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
      )
    })
  }, [stats, search, statusFilter])

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

  const { summary, targets, topCities, topCategories, trend, recentLogs, whatsapp, pipeline, ratings } = stats
  const phoneRate = summary.total > 0 ? Math.round((summary.withPhone / summary.total) * 100) : 0
  const coverage = targets.active > 0 ? Math.round((targets.covered / targets.active) * 100) : 0
  const maxCity = topCities[0]?.count ?? 1
  const maxCat = topCategories[0]?.count ?? 1
  const maxPipeline = Math.max(...PIPELINE_ORDER.map(k => pipeline[k] ?? 0), 1)
  const maxRatingBucket = Math.max(...ratings.distribution.map(d => d.count), 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">BizHarvest Analytics</h1>
          <p className="mt-0.5 text-[13px] text-gray-400">Local scraper — Google Maps + JustDial lead pipeline</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 sm:py-2 text-[13px] font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50 self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Leads" value={summary.total} sub="across all sources" icon={Database} />
        <StatCard label="With Phone" value={`${summary.withPhone.toLocaleString()} (${phoneRate}%)`} sub="contactable leads" icon={Phone} accent="#16a34a" />
        <StatCard label="Cities / Categories" value={`${summary.distinctCities} / ${summary.distinctCategories}`} sub="unique coverage" icon={MapPin} accent="#2563eb" />
        <StatCard label="Avg Rating" value={summary.avgRating || '—'} sub={`${ratings.rated} businesses rated`} icon={Star} accent="#eab308" />
      </div>

      {/* AI Chat — ask for leads in plain English */}
      <BizHarvestChat />

      {/* Target + WhatsApp + Pipeline row */}
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
            <p className="text-[13px] font-semibold text-gray-700">WhatsApp Outreach</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Messages queued</span>
              <span className="font-bold text-green-600">{whatsapp.queued.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Source</span>
              <span className="font-medium text-gray-500">Local WA daemon</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Every lead with a phone number is auto-queued on ingest</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-purple-500" />
            <p className="text-[13px] font-semibold text-gray-700">Sales Pipeline</p>
          </div>
          <div className="space-y-2.5">
            {PIPELINE_ORDER.map(k => (
              <HBar key={k} label={k} count={pipeline[k] ?? 0} max={maxPipeline} color={PIPELINE_COLOR[k]} />
            ))}
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

      {/* Ratings: distribution + top rated */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-yellow-500" />
            <p className="text-[13px] font-semibold text-gray-700">Rating Distribution</p>
          </div>
          {ratings.rated === 0 ? (
            <p className="text-[13px] text-gray-400">No rated businesses yet</p>
          ) : (
            <div className="space-y-3">
              {ratings.distribution.map(({ bucket, count }) => (
                <HBar key={bucket} label={bucket} count={count} max={maxRatingBucket} color="#eab308" />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-[13px] font-semibold text-gray-700">Top Rated Businesses</p>
          </div>
          {ratings.topRated.length === 0 ? (
            <p className="text-[13px] text-gray-400">No rated businesses yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {ratings.topRated.map(b => (
                <div key={b.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">{b.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{b.category} · {b.city}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-gray-700">{b.rating}</span>
                    <span className="text-gray-400">({b.reviewCount})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client directory */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#B08D57]" />
            <p className="text-[13px] font-semibold text-gray-700">Client Directory</p>
            <span className="text-[11px] text-gray-400">({filteredLeads.length} of {stats.recentLeads.length} shown)</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, city, category..."
                className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#B08D57] sm:w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-[12px] rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
            >
              <option value="all">All statuses</option>
              {PIPELINE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {filteredLeads.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-[13px] text-gray-400">No leads match your filters</div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="space-y-2 md:hidden">
              {filteredLeads.map(l => (
                <div key={l.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-[13px] truncate">{l.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{l.category || '—'} · {l.city || '—'}</p>
                    </div>
                    <LeadStatusPill status={l.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 text-gray-600">
                      {l.phone ? <span>{l.phone}</span> : <span className="text-gray-300">No phone</span>}
                      {l.website && (
                        <a href={l.website} target="_blank" rel="noopener noreferrer" className="text-[#B08D57]">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {l.rating ? (
                      <span className="flex items-center gap-1 text-gray-700">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{l.rating}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="capitalize">{l.source}</span>
                    <span>{timeAgo(l.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-left">
                    <th className="pb-2 font-semibold">Business</th>
                    <th className="pb-2 font-semibold">City / Category</th>
                    <th className="pb-2 font-semibold">Contact</th>
                    <th className="pb-2 font-semibold">Rating</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Source</th>
                    <th className="pb-2 font-semibold">Scraped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeads.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="py-2 font-medium text-gray-800 max-w-[180px] truncate">{l.name}</td>
                      <td className="py-2 text-gray-500">
                        <div className="truncate max-w-[160px]">{l.city}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[160px]">{l.category}</div>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          {l.phone ? <span>{l.phone}</span> : <span className="text-gray-300">—</span>}
                          {l.website && (
                            <a href={l.website} target="_blank" rel="noopener noreferrer" className="text-[#B08D57] hover:text-[#8f7145]">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        {l.rating ? (
                          <span className="flex items-center gap-1 text-gray-700">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{l.rating}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2"><LeadStatusPill status={l.status} /></td>
                      <td className="py-2 text-gray-400 capitalize">{l.source}</td>
                      <td className="py-2 text-gray-400 whitespace-nowrap">{timeAgo(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
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
          <>
            {/* Mobile: compact rows */}
            <div className="sm:hidden divide-y divide-gray-50">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between gap-2 py-2 text-[12px]">
                  <StatusPill status={log.status} />
                  <div className="flex items-center gap-2.5 text-gray-500">
                    <span className="text-green-600 font-medium">+{log.inserted}</span>
                    <span>{log.skipped} skip</span>
                    <span className="text-red-400">{log.errors} err</span>
                  </div>
                  <span className="text-gray-400 text-[11px] shrink-0">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
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
          </>
        )}
      </div>
    </div>
  )
}
