'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Gavel, Loader2, AlertCircle, RefreshCw, Search, Sparkles, Download,
  Mail, Building2, Send, Trash2, RotateCcw, X, ChevronRight, ExternalLink,
} from 'lucide-react'
import { rankTenders } from '@/lib/tenderpulse-search'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Tender {
  id: string
  external_ref: string
  title: string
  organization: string | null
  district: string | null
  category: string | null
  bid_submission_deadline: string | null
  publish_date: string | null
  nit_document_url: string | null
  estimated_value_inr: number | null
  notes: string | null
  tags: string[] | null
  is_hidden: boolean
  smart_score?: number
  sources?: { name: string; family: string; state: string } | null
}

interface Analytics {
  total: number
  hidden: number
  upcomingDeadlines7d: number
  expired: number
  noDeadline: number
  byCategory: { name: string; count: number }[]
  byDistrict: { name: string; count: number }[]
  byState: { name: string; count: number }[]
  bySource: { name: string; count: number }[]
  deadlineBuckets: { name: string; count: number }[]
}

interface Client {
  id: string
  company_name: string
  contact_name: string | null
  email: string
  districts: string[]
  categories: string[]
  keywords: string[]
  delivery_frequency: string
  is_active: boolean
}

interface Delivery {
  id: string
  recipient_email: string | null
  tender_ids: string[]
  channel: string
  status: string
  error_message: string | null
  created_at: string
}

const CATEGORIES = ['civil_works', 'supply', 'services', 'it', 'mining', 'health', 'education', 'other']
const CATEGORY_LABELS: Record<string, string> = {
  civil_works: 'Civil Works', supply: 'Supply', services: 'Services', it: 'IT',
  mining: 'Mining', health: 'Health', education: 'Education', other: 'Other',
}
const GOLD = '#B08D57'

// Sort comparator: soonest deadline first, tenders with no deadline last.
function byDeadline(a: Tender, b: Tender) {
  if (!a.bid_submission_deadline) return 1
  if (!b.bid_submission_deadline) return -1
  return a.bid_submission_deadline.localeCompare(b.bid_submission_deadline)
}

function StatCard({ label, value, tone, delay = 0 }: { label: string; value: number | string; tone?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone || 'text-gray-900'}`}>{value}</p>
    </motion.div>
  )
}

function HBar({ data, max }: { data: { name: string; count: number }[]; max?: number }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((d) => (
        <div key={d.name} className="flex items-center gap-2 text-xs">
          <div className="w-28 shrink-0 truncate text-gray-500">{d.name}</div>
          <div className="h-4 flex-1 rounded bg-gray-100">
            <div className="h-full rounded" style={{ width: `${(d.count / top) * 100}%`, backgroundColor: GOLD }} />
          </div>
          <div className="w-8 text-right tabular-nums text-gray-500">{d.count}</div>
        </div>
      ))}
    </div>
  )
}

function DeadlinePill({ deadline, publishDate }: { deadline: string | null; publishDate?: string | null }) {
  if (!deadline) {
    // Some sources (e.g. BSBCCL, BPBCC, JLNMCH) only ever expose an issue/
    // publish date, not a closing date — show that instead of nothing.
    if (publishDate) {
      return (
        <span
          className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400"
          title="This source doesn't list a closing date — showing publish date instead"
        >
          Pub {new Date(publishDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
        </span>
      )
    }
    return <span className="text-xs text-gray-400">No date</span>
  }
  const d = new Date(deadline)
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  let cls = 'bg-gray-50 text-gray-600 border-gray-200'
  if (days < 0) cls = 'bg-gray-50 text-gray-400 border-gray-200 line-through'
  else if (days <= 2) cls = 'bg-red-50 text-red-700 border-red-200'
  else if (days <= 7) cls = 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} {days >= 0 ? `(${days}d)` : ''}
    </span>
  )
}

export default function TenderPulsePage() {
  const [tenders, setTenders] = useState<Tender[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'tenders' | 'clients' | 'deliveries'>('tenders')

  const [query, setQuery] = useState('')
  const [aiFilters, setAiFilters] = useState<Record<string, any> | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [category, setCategory] = useState('')
  const [smartSort, setSmartSort] = useState(true)
  const [showHidden, setShowHidden] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [emailTo, setEmailTo] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [activeTender, setActiveTender] = useState<Tender | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/tenders')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTenders(data.tenders)
      setAnalytics(data.analytics)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function runSmartSearch() {
    if (!query.trim()) { setAiFilters(null); setAiSummary(null); setAiNotice(null); return }
    setSearching(true)
    setAiNotice(null)
    try {
      const res = await fetch('/api/admin/tenders/parse-query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
      })
      const data = await res.json()
      setAiFilters(data.filters)
      setAiSummary(data.filters?.summary || null)
      if (data.error || !data.filters) {
        setAiNotice('AI parsing unavailable — using plain keyword search instead.')
      }
    } catch {
      setAiFilters(null)
      setAiNotice('AI search request failed — using plain keyword search instead.')
    } finally {
      setSearching(false)
    }
  }

  const hasUsableAiFilters = !!aiFilters && (
    aiFilters.categories?.length || aiFilters.districts?.length || aiFilters.states?.length ||
    aiFilters.keywords?.length || aiFilters.min_value != null || aiFilters.max_value != null ||
    aiFilters.urgent_only
  )

  const filtered = useMemo(() => {
    let list = tenders.filter((t) => showHidden || !t.is_hidden)
    if (category) list = list.filter((t) => t.category === category)

    if (hasUsableAiFilters) {
      // Hard structured pre-filters that aren't part of topical relevance —
      // apply them first so ranking runs over the right candidate set.
      if (aiFilters!.states?.length)
        list = list.filter((t) => aiFilters!.states.some((s: string) => t.sources?.state?.toLowerCase() === s.toLowerCase()))
      if (aiFilters!.urgent_only) {
        list = list.filter((t) => {
          if (!t.bid_submission_deadline) return false
          const days = (new Date(t.bid_submission_deadline).getTime() - Date.now()) / 86400000
          return days >= 0 && days <= 7
        })
      }

      // Topical relevance: score category/district/keywords/value into a graded
      // rank (best match first) instead of a binary keyword in/out filter. This
      // is what makes the AI search *sort* accurately, not just filter text.
      const ranked = rankTenders(
        list,
        {
          categories: aiFilters!.categories,
          districts: aiFilters!.districts,
          keywords: aiFilters!.keywords,
          min_value: aiFilters!.min_value,
          max_value: aiFilters!.max_value,
        },
        query,
        { corpusAware: true }
      )
      list = ranked.map((r) => r.tender)
      // While searching, "Smart sort" = relevance (the ranked order above).
      // Turning it off re-orders the same matches by deadline.
      if (!smartSort) list = [...list].sort(byDeadline)
      return list
    }

    if (query.trim() && !searching) {
      // No usable AI-parsed filters (AI unavailable, or the query didn't map to
      // any structured field) — fall back to plain substring search instead of
      // silently showing the entire unfiltered list.
      const q = query.toLowerCase()
      list = list.filter((t) => `${t.title} ${t.organization ?? ''} ${t.district ?? ''}`.toLowerCase().includes(q))
    }

    // No active query: "Smart sort" = the urgency/completeness smart_score.
    if (smartSort) {
      list = [...list].sort((a, b) => (b.smart_score ?? 0) - (a.smart_score ?? 0))
    } else {
      list = [...list].sort(byDeadline)
    }
    return list
  }, [tenders, showHidden, category, aiFilters, hasUsableAiFilters, query, searching, smartSort])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleHideToggle(t: Tender) {
    const url = t.is_hidden ? `/api/admin/tenders/${t.id}/restore` : `/api/admin/tenders/${t.id}`
    await fetch(url, { method: t.is_hidden ? 'POST' : 'DELETE' })
    load(true)
  }

  async function handleCategoryChange(id: string, cat: string) {
    setTenders((prev) => prev.map((t) => (t.id === id ? { ...t, category: cat } : t)))
    await fetch(`/api/admin/tenders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: cat }),
    })
  }

  async function handleSendSelected() {
    if (!emailTo || !selected.size) return
    setSending(true)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/tenders/send-selected', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, tenderIds: Array.from(selected) }),
      })
      const data = await res.json()
      setNotice(data.sent ? `Sent ${selected.size} tenders to ${emailTo}` : `Failed: ${data.error}`)
    } finally {
      setSending(false)
    }
  }

  function exportUrl(format: string) {
    const ids = Array.from(selected)
    return `/api/admin/tenders/export/${format}${ids.length ? `?ids=${ids.join(',')}` : ''}`
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-gray-500">{error}</p>
        <button onClick={() => load()} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
            <Gavel className="h-5 w-5" style={{ color: GOLD }} />
            TenderPulse BJ
          </h1>
          <p className="text-sm text-gray-400">Bihar &amp; Jharkhand government tenders — {analytics?.total ?? 0} active</p>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {(['tenders', 'clients', 'deliveries'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
            style={tab === t ? { borderColor: GOLD } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'tenders' && analytics && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Active tenders" value={analytics.total} delay={0} />
            <StatCard label="Due &lt; 7 days" value={analytics.upcomingDeadlines7d} tone="text-amber-600" delay={0.05} />
            <StatCard label="Expired" value={analytics.expired} tone="text-red-500" delay={0.1} />
            <StatCard label="No deadline" value={analytics.noDeadline} delay={0.15} />
            <StatCard label="Hidden" value={analytics.hidden} delay={0.2} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">By category</p>
              <HBar data={analytics.byCategory} />
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Deadline urgency</p>
              <HBar data={analytics.deadlineBuckets} />
            </div>
          </div>

          {/* Smart search */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSmartSearch()}
                placeholder="Ask in plain English: 'construction tenders in Gaya due this week above 5 lakh'"
                className="flex-1 border-none text-sm outline-none placeholder:text-gray-400"
              />
              <button
                onClick={runSmartSearch}
                disabled={searching}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: GOLD }}
              >
                {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                AI Search
              </button>
            </div>
            {aiSummary && (
              <p className="mt-2 text-xs text-gray-500">
                Understood as: <span className="font-medium text-gray-700">{aiSummary}</span>{' '}
                <button onClick={() => { setAiFilters(null); setAiSummary(null); setQuery('') }} className="ml-1 text-red-500 underline">
                  clear
                </button>
              </p>
            )}
            {aiNotice && !aiSummary && (
              <p className="mt-2 text-xs text-gray-400">{aiNotice}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <button
                onClick={() => setSmartSort((v) => !v)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  smartSort ? 'border-transparent text-white' : 'border-gray-200 text-gray-500'
                }`}
                style={smartSort ? { backgroundColor: GOLD } : undefined}
              >
                <Sparkles className="h-3 w-3" /> Smart sort
              </button>
              <button
                onClick={() => setShowHidden((v) => !v)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${showHidden ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500'}`}
              >
                {showHidden ? 'Showing hidden' : 'Show hidden'}
              </button>
              <span className="ml-auto text-xs text-gray-400">{filtered.length} shown</span>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">{selected.size ? `${selected.size} selected` : 'Select rows to export/email'}</span>
            <div className="flex-1" />
            {['csv', 'xlsx', 'pdf', 'docx'].map((f) => (
              <a key={f} href={exportUrl(f)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                <Download className="h-3 w-3" /> {f.toUpperCase()}
              </a>
            ))}
            {selected.size > 0 && (
              <div className="flex items-center gap-1">
                <input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="client@company.com"
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                />
                <button
                  disabled={sending || !emailTo}
                  onClick={handleSendSelected}
                  className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: GOLD }}
                >
                  <Mail className="h-3 w-3" /> {sending ? 'Sending…' : 'Email'}
                </button>
              </div>
            )}
          </div>
          {notice && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="p-3 w-8">
                    <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id)))} />
                  </th>
                  <th className="p-3 font-medium">Title</th>
                  <th className="p-3 font-medium">District</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Deadline</th>
                  <th className="p-3 font-medium">Source</th>
                  <th className="p-3 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((t) => (
                  <tr key={t.id} onClick={() => setActiveTender(t)} className={`cursor-pointer border-b border-gray-50 hover:bg-gray-50 ${t.is_hidden ? 'opacity-50' : ''}`}>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                    </td>
                    <td className="p-3 max-w-[360px]">
                      <p className="line-clamp-2 font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.organization}</p>
                    </td>
                    <td className="p-3 text-gray-600">{t.district || '—'}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <select value={t.category || 'other'} onChange={(e) => handleCategoryChange(t.id, e.target.value)} className="rounded border-none bg-transparent text-xs">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                      </select>
                    </td>
                    <td className="p-3"><DeadlinePill deadline={t.bid_submission_deadline} publishDate={t.publish_date} /></td>
                    <td className="p-3 max-w-[140px] truncate text-xs text-gray-400">{t.sources?.name}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleHideToggle(t)} className="text-gray-400 hover:text-red-500">
                        {t.is_hidden ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.slice(0, 100).map((t) => (
              <div key={t.id} onClick={() => setActiveTender(t)} className={`rounded-2xl border border-gray-100 bg-white p-3 shadow-sm ${t.is_hidden ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-2">
                  <input type="checkbox" checked={selected.has(t.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(t.id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-gray-900">{t.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{t.organization}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">{CATEGORY_LABELS[t.category || 'other']}</span>
                      {t.district && <span className="text-[11px] text-gray-400">{t.district}</span>}
                      <DeadlinePill deadline={t.bid_submission_deadline} publishDate={t.publish_date} />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No tenders match these filters.</p>}
        </>
      )}

      {tab === 'clients' && <ClientsTab notice={notice} setNotice={setNotice} />}
      {tab === 'deliveries' && <DeliveriesTab />}

      {activeTender && (
        <TenderDrawer tender={activeTender} onClose={() => setActiveTender(null)} onChanged={() => load(true)} />
      )}
    </div>
  )
}

// ─── Tender detail drawer ───────────────────────────────────────────────────
function TenderDrawer({ tender, onClose, onChanged }: { tender: Tender; onClose: () => void; onChanged: () => void }) {
  const [notes, setNotes] = useState(tender.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/admin/tenders/${tender.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative h-full w-full overflow-y-auto bg-white p-5 shadow-xl sm:w-[420px]">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">{tender.title}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-2"><dt className="text-gray-400">Organization</dt><dd className="text-right">{tender.organization || '—'}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-gray-400">District</dt><dd className="text-right">{tender.district || '—'}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-gray-400">Reference</dt><dd className="text-right">{tender.external_ref}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-gray-400">Source</dt><dd className="text-right">{tender.sources?.name}</dd></div>
        </dl>
        {tender.nit_document_url && (
          <a href={tender.nit_document_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-sm underline" style={{ color: GOLD }}>
            <ExternalLink className="h-3.5 w-3.5" /> Open document
          </a>
        )}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <label className="mb-1 block text-xs font-medium text-gray-400">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
          <button onClick={handleSave} disabled={saving} className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: GOLD }}>
            {saving ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Clients tab ────────────────────────────────────────────────────────────
function ClientsTab({ notice, setNotice }: { notice: string | null; setNotice: (n: string | null) => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({ company_name: '', email: '', districts: '', keywords: '', categories: [] as string[] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/tenders/clients')
    setClients(await res.json())
  }, [])
  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/admin/tenders/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name, email: form.email,
          districts: form.districts.split(',').map((s) => s.trim()).filter(Boolean),
          keywords: form.keywords.split(',').map((s) => s.trim()).filter(Boolean),
          categories: form.categories,
        }),
      })
      setForm({ company_name: '', email: '', districts: '', keywords: '', categories: [] })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleSendNow(id: string) {
    const res = await fetch(`/api/admin/tenders/clients/${id}/send-now`, { method: 'POST' })
    const data = await res.json()
    setNotice(data.sent ? `Sent ${data.tenderCount} tenders` : data.reason || data.error || 'Failed')
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/tenders/clients/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-4">
      {notice && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>}
      <form onSubmit={handleAdd} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900"><Building2 className="h-4 w-4" /> Add a client</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input required placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input placeholder="Districts (comma sep, blank = all)" value={form.districts} onChange={(e) => setForm({ ...form, districts: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input placeholder="Keywords (comma sep)" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c} type="button"
              onClick={() => setForm((f) => ({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] }))}
              className={`rounded-full border px-2 py-0.5 text-xs ${form.categories.includes(c) ? 'text-white' : 'border-gray-200 text-gray-500'}`}
              style={form.categories.includes(c) ? { backgroundColor: GOLD, borderColor: GOLD } : undefined}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <button disabled={saving} type="submit" className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: GOLD }}>
          {saving ? 'Saving…' : 'Add client'}
        </button>
      </form>

      <div className="space-y-2">
        {clients.map((c) => (
          <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{c.company_name}</p>
                <p className="text-xs text-gray-400">{c.email}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSendNow(c.id)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: GOLD }}>
                  <Send className="h-3 w-3" /> Send now
                </button>
                <button onClick={() => handleDelete(c.id)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-red-500">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {clients.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No clients yet.</p>}
      </div>
    </div>
  )
}

// ─── Deliveries tab ─────────────────────────────────────────────────────────
function DeliveriesTab() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  useEffect(() => {
    fetch('/api/admin/tenders/deliveries').then((r) => r.json()).then(setDeliveries)
  }, [])

  const statusColor: Record<string, string> = {
    sent: 'bg-emerald-50 text-emerald-700', failed: 'bg-red-50 text-red-700', pending: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="space-y-2">
      {deliveries.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{d.recipient_email} <span className="font-normal text-gray-400">· {d.tender_ids.length} tenders</span></p>
            <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleString()}{d.error_message ? ` — ${d.error_message}` : ''}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusColor[d.status] || ''}`}>{d.status}</span>
        </div>
      ))}
      {deliveries.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No deliveries sent yet.</p>}
    </div>
  )
}
