'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search, RefreshCw, Loader2, Phone, Globe,
  MapPin, Tag, Star, Sparkles, CheckCircle2, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface PotentialLead {
  id: string
  business_name: string
  city: string
  category: string
  phone: string | null
  website: string | null
  address: string | null
  ai_score: number
  status: string
  created_at: string
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7 ? 'text-green-500 bg-green-500/10 border-green-500/20'
    : score >= 4 ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    : 'text-red-500 bg-red-500/10 border-red-500/20'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${color}`}>
      <Star className="w-3 h-3" /> {score}/10
    </span>
  )
}

export default function PotentialLeadsPage() {
  const [leads, setLeads] = useState<PotentialLead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [minScore, setMinScore] = useState(0)

  const fetch = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (city) params.set('city', city)
    if (category) params.set('category', category)
    if (minScore > 0) params.set('min_score', String(minScore))
    const res = await window.fetch(`/api/admin/potential-leads?${params}`)
    const json = await res.json()
    setLeads(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, city, category, minScore])

  useEffect(() => { fetch() }, [fetch])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === leads.length) setSelected(new Set())
    else setSelected(new Set(leads.map(l => l.id)))
  }

  const analyzeSelected = async () => {
    if (!selected.size) return
    setAnalyzing(true)
    try {
      const res = await window.fetch('/api/admin/potential-leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      })
      const json = await res.json()
      if (json.scores) {
        const scoreMap = new Map(json.scores.map((s: { id: string; score: number }) => [s.id, s.score]))
        setLeads(prev => prev.map(l => scoreMap.has(l.id) ? { ...l, ai_score: scoreMap.get(l.id) as number } : l))
      }
      setSelected(new Set())
    } finally {
      setAnalyzing(false)
    }
  }

  const addToCrm = async (lead: PotentialLead) => {
    await window.fetch('/api/admin/potential-leads/add-to-crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id }),
    })
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'converted' } : l))
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">AI Lead Database</h1>
          <p className="text-[var(--muted)]">{total.toLocaleString('en-IN')} scraped leads — auto-generated every 20 min</p>
        </div>
        <div className="flex gap-3">
          {selected.size > 0 && (
            <button
              onClick={analyzeSelected}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Analyzing...' : `AI Score ${selected.size} leads`}
            </button>
          )}
          <button
            onClick={fetch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] text-sm font-semibold hover:border-[var(--primary)]/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            placeholder="City..."
            value={city}
            onChange={e => { setCity(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            placeholder="Category..."
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={minScore}
          onChange={e => { setMinScore(Number(e.target.value)); setPage(1) }}
          className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value={0}>All scores</option>
          <option value={7}>High quality (7+)</option>
          <option value={5}>Medium+ (5+)</option>
          <option value={4}>4+ only</option>
        </select>
        <button
          onClick={selectAll}
          className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm font-medium hover:border-[var(--primary)]/50 transition-colors"
        >
          {selected.size === leads.length && leads.length > 0 ? 'Deselect all' : `Select all ${leads.length}`}
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--primary)]" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">No leads match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)] text-xs uppercase">
                  <th className="p-3 text-left w-8"><input type="checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={selectAll} className="rounded" /></th>
                  <th className="p-3 text-left">Business</th>
                  <th className="p-3 text-left">City</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Score</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-[var(--border)]/50 hover:bg-[var(--surface)]/50 transition-colors ${selected.has(lead.id) ? 'bg-[var(--primary)]/5' : ''}`}
                  >
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded" />
                    </td>
                    <td className="p-3">
                      <div className="font-medium max-w-[200px] truncate">{lead.business_name}</div>
                      {lead.address && <div className="text-xs text-[var(--muted)] truncate max-w-[200px]">{lead.address}</div>}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3" /> {lead.website.replace(/^https?:\/\//, '').split('/')[0].slice(0, 25)}
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 text-[var(--muted)]"><MapPin className="w-3 h-3" />{lead.city}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--secondary)] text-xs">{lead.category}</span>
                    </td>
                    <td className="p-3">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-[var(--foreground)] hover:text-[var(--primary)]">
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </a>
                      ) : <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="p-3"><ScoreBadge score={lead.ai_score} /></td>
                    <td className="p-3 text-[var(--muted)] text-xs">{new Date(lead.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="p-3">
                      {lead.status === 'converted' ? (
                        <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle2 className="w-3 h-3" /> In CRM</span>
                      ) : (
                        <button
                          onClick={() => addToCrm(lead)}
                          className="px-2 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors"
                        >
                          + Add to CRM
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--muted)]">
            Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total.toLocaleString('en-IN')}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:border-[var(--primary)]/50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:border-[var(--primary)]/50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
