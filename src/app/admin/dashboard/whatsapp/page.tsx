'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server, Send, Clock, CheckCircle2, XCircle,
  Trash2, RefreshCw, X, RotateCcw, Activity,
  MessageSquare, Building2, AlertTriangle, Wifi,
  Upload, Users, FileText, ChevronDown, Sparkles, RotateCw,
  FileDown, Pencil, Ban, Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { exportWhatsAppReportPDF } from '@/lib/whatsapp-export'

interface QueueMsg {
  id: string
  to_number: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  error?: string | null
  created_at: string
  company_id?: string | null
  contact_name?: string | null
}

interface DaemonStats {
  ready: boolean
  hasQR: boolean
  sentToday: number
  dailyLimit: number
}

const STATUS_PILL: Record<string, string> = {
  sent:    'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed:  'bg-red-50 text-red-700 border-red-200',
}

const PAGE_SIZE = 50

function personalizeClient(template: string, name: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (key.toLowerCase() === 'name' ? (name || `{{${key}}}`) : `{{${key}}}`))
}

// Shows the resolved message per contact and lets the admin override any
// single contact's message — everyone else keeps using the shared template.
function ContactPreviewList({
  contacts, template, overrides, onOverrideChange,
}: {
  contacts: { phone: string; name: string }[]
  template: string
  overrides: Record<string, string>
  onOverrideChange: (key: string, message: string | null) => void
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const visible = contacts.slice(0, 200)

  return (
    <div>
      <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        {visible.map((c, i) => {
          const key = c.phone || String(i)
          const hasOverride = key in overrides
          const resolved = hasOverride ? overrides[key] : personalizeClient(template, c.name)
          const isEditing = editingKey === key
          return (
            <div key={key} className="px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate">
                  <span className="font-mono text-[var(--foreground)]">{c.phone || '—'}</span>
                  {c.name && <span className="text-[var(--muted)] ml-1.5">· {c.name}</span>}
                  {hasOverride && <span className="ml-1.5 text-[10px] font-semibold text-purple-600">custom</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasOverride && (
                    <button onClick={() => onOverrideChange(key, null)} className="text-[10px] text-[var(--muted)] hover:text-red-500">Reset</button>
                  )}
                  <button
                    onClick={() => { setEditingKey(isEditing ? null : key); setDraft(resolved) }}
                    className="p-1 rounded hover:bg-[var(--secondary)]"
                    title="Edit message for this contact"
                  >
                    <Pencil className="w-3 h-3 text-[var(--muted)]" />
                  </button>
                </div>
              </div>
              {isEditing ? (
                <div className="mt-1.5 flex items-start gap-1.5">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={2}
                    className="flex-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 outline-none focus:border-purple-500 resize-none"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => { onOverrideChange(key, draft); setEditingKey(null) }}
                      className="text-[10px] px-2 py-1 rounded bg-purple-600 text-white font-semibold"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingKey(null)} className="text-[10px] px-2 py-1 rounded text-[var(--muted)]">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-[var(--muted)] truncate">{resolved || <em className="opacity-50">empty message</em>}</p>
              )}
            </div>
          )
        })}
      </div>
      {contacts.length > 200 && (
        <p className="mt-1.5 text-[10px] text-[var(--muted)]">Showing first 200 for preview/editing — the rest use the shared template above.</p>
      )}
    </div>
  )
}

export default function WhatsAppAdmin() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [daemonStatus, setDaemonStatus] = useState<'checking' | 'offline' | 'needs_auth' | 'connected'>('checking')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueMsg[]>([])
  const [daemonStats, setDaemonStats] = useState<DaemonStats>({ ready: false, hasQR: false, sentToday: 0, dailyLimit: 20 })
  const [dbStats, setDbStats] = useState({ pending: 0, sent: 0, failed: 0 })

  const [showSendForm, setShowSendForm] = useState(false)
  const [sendNumber, setSendNumber] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmClearPending, setConfirmClearPending] = useState(false)
  const [clearingPending, setClearingPending] = useState(false)
  const [companyFilter, setCompanyFilter] = useState<'all' | 'admin'>('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [exportingReport, setExportingReport] = useState(false)

  // CSV / AI / Leads bulk send
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkTab, setBulkTab] = useState<'file' | 'ai' | 'leads'>('file')
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([])
  const [bulkRawRows, setBulkRawRows] = useState<Record<string, string>[]>([])
  const [bulkPhoneCol, setBulkPhoneCol] = useState('')
  const [bulkNameCol, setBulkNameCol] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkParsing, setBulkParsing] = useState(false)
  const [bulkQueuing, setBulkQueuing] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ queued: number; skipped: number } | null>(null)
  const [bulkError, setBulkError] = useState('')
  const [bulkOverrides, setBulkOverrides] = useState<Record<string, string>>({})
  const bulkFileRef = useRef<HTMLInputElement>(null)
  // AI smart extract state
  const [aiRawText, setAiRawText] = useState('')
  const [aiExtracted, setAiExtracted] = useState<{ phone: string; name: string }[]>([])
  const [aiExtracting, setAiExtracting] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiMessage, setAiMessage] = useState('')
  const [aiQueuing, setAiQueuing] = useState(false)
  const [aiResult, setAiResult] = useState<{ queued: number; skipped: number } | null>(null)
  const [aiOverrides, setAiOverrides] = useState<Record<string, string>>({})
  // Load selectively from BizHarvest leads (reuses the same NL filter chat uses)
  const [leadsQuery, setLeadsQuery] = useState('')
  const [leadsSearching, setLeadsSearching] = useState(false)
  const [leadsSearchError, setLeadsSearchError] = useState('')
  const [leadsReply, setLeadsReply] = useState('')
  const [leadsResults, setLeadsResults] = useState<{ id: string; name: string; phone: string; city: string | null; category: string | null }[]>([])
  const [leadsSelected, setLeadsSelected] = useState<Set<string>>(new Set())
  const [leadsMessage, setLeadsMessage] = useState('')
  const [leadsOverrides, setLeadsOverrides] = useState<Record<string, string>>({})
  const [leadsQueuing, setLeadsQueuing] = useState(false)
  const [leadsResult, setLeadsResult] = useState<{ queued: number; skipped: number } | null>(null)
  const [leadsQueueError, setLeadsQueueError] = useState('')
  // Reset QR session
  const [resettingSession, setResettingSession] = useState(false)

  const fetchQueue = useCallback(async () => {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let q = supabase
      .from('whatsapp_queue')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (companyFilter === 'admin') q = q.is('company_id', null)
    const { data, count } = await q
    if (data) {
      setQueue(data as QueueMsg[])
      setTotalCount(count ?? 0)
    }
  }, [supabase, page, companyFilter])

  // Global counts (independent of the current page) — computing these from
  // just the visible page was wrong once results exceeded one page.
  const countByStatus = useCallback(async (status: 'pending' | 'sent' | 'failed') => {
    let q = supabase.from('whatsapp_queue').select('id', { count: 'exact', head: true }).eq('status', status)
    if (companyFilter === 'admin') q = q.is('company_id', null)
    const { count } = await q
    return count ?? 0
  }, [supabase, companyFilter])

  const fetchStats = useCallback(async () => {
    const [pending, sent, failed] = await Promise.all([
      countByStatus('pending'),
      countByStatus('sent'),
      countByStatus('failed'),
    ])
    setDbStats({
      pending,
      sent,
      failed,
    })
  }, [countByStatus])

  const fetchQrCode = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3005/api/qr', { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const data = await res.json()
        if (data.qr) setQrCode(data.qr)
      }
    } catch {}
  }, [])

  const fetchDaemonStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3005/api/status', { signal: AbortSignal.timeout(4000) })
      if (!res.ok) { setDaemonStatus('offline'); return }
      const data: DaemonStats = await res.json()
      setDaemonStats(data)
      if (data.ready) {
        setDaemonStatus('connected')
      } else {
        setDaemonStatus('needs_auth')
        fetchQrCode()
      }
    } catch {
      setDaemonStatus('offline')
    }
  }, [fetchQrCode])

  useEffect(() => {
    fetchDaemonStatus()
    fetchQueue()
    fetchStats()
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      fetchDaemonStatus()
      fetchQueue()
      fetchStats()
    }, 6000)
    return () => clearInterval(interval)
  }, [fetchDaemonStatus, fetchQueue, fetchStats])

  // Filtering changes the underlying result set — always land back on page 0.
  useEffect(() => { setPage(0) }, [companyFilter])

  const handleSend = async () => {
    if (!sendNumber.trim() || !sendMessage.trim()) return
    setSending(true)
    setSendError('')
    try {
      const { error } = await supabase.from('whatsapp_queue').insert({
        to_number: sendNumber.trim().replace(/\s/g, ''),
        message: sendMessage.trim(),
        status: 'pending',
        company_id: null,
      })
      if (error) throw new Error(error.message)
      setSendNumber('')
      setSendMessage('')
      setShowSendForm(false)
      fetchQueue()
      fetchStats()
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to queue message')
    } finally {
      setSending(false)
    }
  }

  const retryFailed = async () => {
    // Update by status directly (not by current-page ids) — the failed count
    // shown on the button is global, and pagination means `queue` may only
    // hold a subset of the failed rows.
    let q = supabase
      .from('whatsapp_queue')
      .update({ status: 'pending', error: null, updated_at: new Date().toISOString() })
      .eq('status', 'failed')
    if (companyFilter === 'admin') q = q.is('company_id', null)
    await q
    fetchQueue()
    fetchStats()
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('whatsapp_queue').delete().eq('id', id)
    setQueue(prev => prev.filter(m => m.id !== id))
    setTotalCount(c => Math.max(0, c - 1))
    fetchStats()
  }

  const clearHistory = async () => {
    let q = supabase.from('whatsapp_queue').delete().in('status', ['sent', 'failed'])
    if (companyFilter === 'admin') q = q.is('company_id', null)
    await q
    setConfirmClear(false)
    setPage(0)
    fetchQueue()
    fetchStats()
  }

  // Cancels every message still queued to send — distinct from clearHistory
  // (which only removes already-resolved sent/failed rows). This deletes
  // work that hasn't happened yet, so it gets its own confirm dialog.
  const clearPending = async () => {
    setClearingPending(true)
    try {
      let q = supabase.from('whatsapp_queue').delete().eq('status', 'pending')
      if (companyFilter === 'admin') q = q.is('company_id', null)
      await q
      setConfirmClearPending(false)
      setPage(0)
      fetchQueue()
      fetchStats()
    } finally {
      setClearingPending(false)
    }
  }

  const handleBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkParsing(true)
    setBulkError('')
    setBulkResult(null)
    setBulkHeaders([])
    setBulkRawRows([])
    setBulkOverrides({})
    try {
      const { parseFile } = await import('@/lib/import/fileParser')
      const parsed = await parseFile(file)
      const headers = parsed.headers.filter(h => h && !h.startsWith('__EMPTY'))
      setBulkHeaders(headers)
      setBulkRawRows(parsed.rows)
      // Auto-detect phone column
      const phoneRe = /phone|mobile|whatsapp|contact|cell|tel/i
      const nameRe = /name|person|contact/i
      const autoPhone = headers.find(h => phoneRe.test(h)) ?? ''
      const autoName = headers.find(h => nameRe.test(h) && !phoneRe.test(h)) ?? ''
      setBulkPhoneCol(autoPhone)
      setBulkNameCol(autoName)
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setBulkParsing(false)
      if (bulkFileRef.current) bulkFileRef.current.value = ''
    }
  }

  const handleBulkQueue = async () => {
    if (!bulkPhoneCol || !bulkMessage.trim() || !bulkRawRows.length) return
    setBulkQueuing(true)
    setBulkError('')
    try {
      const contacts = bulkRawRows
        .map(row => {
          const phone = row[bulkPhoneCol] ?? ''
          const name = bulkNameCol ? (row[bulkNameCol] ?? '') : ''
          const override = bulkOverrides[phone]
          return override !== undefined ? { phone, name, message: override } : { phone, name }
        })
        .filter(c => c.phone)
      const res = await fetch('/api/admin/whatsapp/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, message: bulkMessage }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBulkResult({ queued: data.queued, skipped: data.skipped })
      fetchQueue()
      fetchStats()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to queue messages')
    } finally {
      setBulkQueuing(false)
    }
  }

  const handleAiExtract = async () => {
    if (!aiRawText.trim()) return
    setAiExtracting(true)
    setAiError('')
    setAiExtracted([])
    setAiResult(null)
    setAiOverrides({})
    try {
      const res = await fetch('/api/admin/whatsapp/extract-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiRawText }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiExtracted(data.contacts ?? [])
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setAiExtracting(false)
    }
  }

  const handleAiQueue = async () => {
    if (!aiExtracted.length || !aiMessage.trim()) return
    setAiQueuing(true)
    setAiError('')
    try {
      const contacts = aiExtracted.map(c => {
        const override = aiOverrides[c.phone]
        return override !== undefined ? { ...c, message: override } : c
      })
      const res = await fetch('/api/admin/whatsapp/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, message: aiMessage }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiResult({ queued: data.queued, skipped: data.skipped })
      fetchQueue()
      fetchStats()
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to queue')
    } finally {
      setAiQueuing(false)
    }
  }

  const handleLeadsSearch = async () => {
    if (!leadsQuery.trim()) return
    setLeadsSearching(true)
    setLeadsSearchError('')
    setLeadsResults([])
    setLeadsSelected(new Set())
    setLeadsResult(null)
    try {
      const res = await fetch('/api/admin/bizharvest/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: leadsQuery }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setLeadsReply(data.reply ?? '')
      // Only rows with a phone number are actionable here — WhatsApp needs one.
      const withPhone = (data.leads ?? []).filter((l: any) => l.phone)
      setLeadsResults(withPhone)
      // Selected by default so the queue count matches what's visibly checked.
      setLeadsSelected(new Set(withPhone.map((l: any) => l.id)))
    } catch (err) {
      setLeadsSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLeadsSearching(false)
    }
  }

  const handleLeadsQueue = async () => {
    const targets = leadsResults.filter(l => leadsSelected.has(l.id))
    if (!targets.length || !leadsMessage.trim()) return
    setLeadsQueuing(true)
    setLeadsQueueError('')
    try {
      const contacts = targets.map(l => {
        const override = leadsOverrides[l.phone]
        return override !== undefined ? { phone: l.phone, name: l.name, message: override } : { phone: l.phone, name: l.name }
      })
      const res = await fetch('/api/admin/whatsapp/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, message: leadsMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setLeadsResult({ queued: data.queued, skipped: data.skipped })
      fetchQueue()
      fetchStats()
    } catch (err) {
      setLeadsQueueError(err instanceof Error ? err.message : 'Failed to queue messages')
    } finally {
      setLeadsQueuing(false)
    }
  }

  const handleResetSession = async () => {
    if (!confirm('Reset WhatsApp session? This will disconnect and generate a new QR code.')) return
    setResettingSession(true)
    try {
      await fetch('http://localhost:3005/api/reset-session', { method: 'POST', signal: AbortSignal.timeout(6000) })
      setQrCode(null)
      setDaemonStatus('needs_auth')
      setTimeout(fetchDaemonStatus, 3000)
    } catch {
      alert('Could not reach daemon. Make sure it is running.')
    } finally {
      setResettingSession(false)
    }
  }

  const handleExportReport = async () => {
    setExportingReport(true)
    try {
      const res = await fetch(`/api/admin/whatsapp/queue/export${companyFilter === 'admin' ? '?filter=admin' : ''}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      await exportWhatsAppReportPDF(
        data.summary,
        data.messages,
        `whatsapp_report_${new Date().toISOString().slice(0, 10)}`
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to export report')
    } finally {
      setExportingReport(false)
    }
  }

  const isConnected = daemonStatus === 'connected'
  const isOffline = daemonStatus === 'offline'
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-8">

      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-green-500/10 border border-green-500/20 shrink-0">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-[var(--foreground)]">WhatsApp Bridge</h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">Shared local daemon — admin + business outreach</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
            isConnected ? 'bg-green-50 text-green-700 border-green-200' :
            isOffline   ? 'bg-red-50 text-red-600 border-red-200' :
            daemonStatus === 'checking' ? 'bg-[var(--secondary)] text-[var(--muted)] border-[var(--border)]' :
            'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : isOffline ? 'bg-red-500' : 'bg-amber-400'}`} />
            {daemonStatus === 'checking' ? 'Checking' : daemonStatus === 'connected' ? 'Connected' : daemonStatus === 'needs_auth' ? 'Needs auth' : 'Offline'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {dbStats.failed > 0 && (
            <button onClick={retryFailed}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Retry failed ({dbStats.failed})
            </button>
          )}
          <button onClick={() => {
            setShowBulkForm(true)
            setBulkResult(null); setBulkError(''); setBulkOverrides({})
            setAiResult(null); setAiError(''); setAiExtracted([]); setAiRawText(''); setAiMessage(''); setAiOverrides({})
            setLeadsResult(null); setLeadsQueueError(''); setLeadsSearchError(''); setLeadsResults([]); setLeadsSelected(new Set()); setLeadsQuery(''); setLeadsMessage(''); setLeadsOverrides({}); setLeadsReply('')
            setBulkTab('file')
          }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            Bulk send CSV
          </button>
          <button onClick={() => { setShowSendForm(true); setSendError('') }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm">
            <Send className="w-4 h-4" />
            Send test
          </button>
        </div>
      </div>

      {/* Daily usage */}
      <div className="mb-6 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">Daily messages</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-[var(--foreground)]">
            {daemonStats.sentToday} / {daemonStats.dailyLimit}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--secondary)] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${Math.min((daemonStats.sentToday / daemonStats.dailyLimit) * 100, 100)}%` }} />
        </div>
        <p className="text-xs text-[var(--muted)] mt-1.5">Anti-ban: max {daemonStats.dailyLimit}/day, 45–90 sec random delay between sends</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        {[
          { label: 'Pending', value: dbStats.pending, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Sent',    value: dbStats.sent,    cls: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Failed',  value: dbStats.failed,  cls: 'bg-red-50 border-red-200 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`p-2.5 sm:p-4 rounded-2xl border text-center ${s.cls}`}>
            <p className="text-lg sm:text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</p>
            <p className="text-[11px] sm:text-xs font-medium mt-0.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daemon / Auth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-[var(--secondary)]"><Server className="w-4 h-4 text-[var(--foreground)]" /></div>
            <div>
              <p className="font-semibold text-sm text-[var(--foreground)]">Local Daemon</p>
              <p className="text-xs text-[var(--muted)] font-mono">http://localhost:3005</p>
            </div>
            <button onClick={fetchDaemonStatus} className="ml-auto p-1.5 rounded-lg hover:bg-[var(--secondary)] transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
            </button>
          </div>
          {isOffline ? (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-500 mb-0.5">Daemon not running</p>
                <p className="text-xs text-amber-400/80">Run <code className="bg-amber-500/15 px-1 rounded">node whatsapp-host.mjs</code> on your machine</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Online · polling every 15 seconds</span>
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-[var(--secondary)]"><MessageSquare className="w-4 h-4 text-[var(--foreground)]" /></div>
            <p className="font-semibold text-sm text-[var(--foreground)]">Phone authentication</p>
          </div>
          {isOffline ? (
            <div className="flex items-center justify-center h-28 rounded-xl border-2 border-dashed border-[var(--border)]">
              <p className="text-sm text-[var(--muted)]">Start daemon first</p>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col items-center justify-center h-28 rounded-xl bg-green-50 border border-green-200 gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <p className="font-semibold text-sm text-green-700">Ready to send</p>
              <button onClick={handleResetSession} disabled={resettingSession}
                className="flex items-center gap-1.5 mt-1 text-xs text-green-600 hover:text-red-500 transition-colors disabled:opacity-50">
                <RotateCw className="w-3 h-3" />
                {resettingSession ? 'Resetting…' : 'Reset / re-link'}
              </button>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-2 rounded-xl border border-[var(--border)]">
                <img src={qrCode} alt="QR Code" className="w-36 h-36" />
              </div>
              <p className="text-xs text-center text-[var(--muted)]">WhatsApp → Linked Devices → Link a Device</p>
              <button onClick={handleResetSession} disabled={resettingSession}
                className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-red-500 transition-colors disabled:opacity-50">
                <RotateCw className="w-3 h-3" />
                {resettingSession ? 'Resetting…' : 'Force new QR'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 gap-2">
              <div className="w-6 h-6 border-2 border-[var(--border)] border-t-green-500 rounded-full animate-spin" />
              <p className="text-sm text-[var(--muted)]">Generating QR…</p>
              <button onClick={handleResetSession} disabled={resettingSession}
                className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-red-500 transition-colors disabled:opacity-50">
                <RotateCw className="w-3 h-3" />
                {resettingSession ? 'Resetting…' : 'Not showing? Force reset'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue table */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
        <div className="flex flex-col gap-3 px-4 sm:px-5 py-4 border-b border-[var(--border)] sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-sm text-[var(--foreground)]">Message Queue</h2>
            <span className="text-xs text-[var(--muted)] bg-[var(--secondary)] rounded-full px-2 py-0.5 tabular-nums">{totalCount.toLocaleString()}</span>
            <div className="flex gap-1">
              {(['all', 'admin'] as const).map(f => (
                <button key={f} onClick={() => setCompanyFilter(f)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${companyFilter === f ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--muted)] hover:bg-[var(--secondary)]'}`}>
                  {f === 'all' ? 'All' : 'Admin only'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <button
              onClick={handleExportReport}
              disabled={exportingReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
              title="Export campaign report as PDF"
            >
              {exportingReport ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button onClick={() => { fetchQueue(); fetchStats() }} className="p-1.5 rounded-lg hover:bg-[var(--secondary)] transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
            </button>
            {dbStats.pending > 0 && (
              <button
                onClick={() => setConfirmClearPending(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                title="Cancel all pending (not-yet-sent) messages"
              >
                <Ban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear pending </span>({dbStats.pending.toLocaleString()})
              </button>
            )}
            <button onClick={() => setConfirmClear(true)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-[var(--muted)] transition-colors" title="Clear sent/failed history">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-[var(--border)]">
          {queue.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-[var(--muted)]">No messages in queue</p>
          ) : queue.map(msg => (
            <div key={msg.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-[var(--foreground)]">{msg.to_number}</p>
                  {msg.contact_name && <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{msg.contact_name}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_PILL[msg.status] ?? STATUS_PILL.pending}`}>
                    {msg.status === 'sent'    && <CheckCircle2 className="w-2.5 h-2.5" />}
                    {msg.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                    {msg.status === 'failed'  && <XCircle className="w-2.5 h-2.5" />}
                    {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                  </span>
                  <button onClick={() => deleteMessage(msg.id)} className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-[var(--muted)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-[var(--muted)] line-clamp-2">{msg.message}</p>
              {msg.error && <p className="mt-1 text-xs text-red-500">{msg.error}</p>}
              <div className="mt-1.5 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${msg.company_id ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-[var(--secondary)] text-[var(--muted)] border-[var(--border)]'}`}>
                  {msg.company_id ? <><Building2 className="w-2.5 h-2.5" />Business</> : 'Admin'}
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {new Date(msg.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                {['Number', 'Message', 'Source', 'Status', 'Time', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {queue.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-[var(--muted)]">No messages in queue</td></tr>
              ) : queue.map(msg => (
                <tr key={msg.id} className="hover:bg-[var(--secondary)] transition-colors group">
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-xs text-[var(--foreground)]">{msg.to_number}</p>
                    {msg.contact_name && <p className="text-xs text-[var(--muted)] mt-0.5">{msg.contact_name}</p>}
                  </td>
                  <td className="px-5 py-3.5 max-w-xs">
                    <span className="block truncate text-xs text-[var(--muted)]" title={msg.message}>{msg.message}</span>
                    {msg.error && <span className="block text-xs text-red-500 mt-0.5">{msg.error}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${msg.company_id ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-[var(--secondary)] text-[var(--muted)] border-[var(--border)]'}`}>
                      {msg.company_id ? <><Building2 className="w-3 h-3" />Business</> : 'Admin'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_PILL[msg.status] ?? STATUS_PILL.pending}`}>
                      {msg.status === 'sent'    && <CheckCircle2 className="w-3 h-3" />}
                      {msg.status === 'pending' && <Clock className="w-3 h-3" />}
                      {msg.status === 'failed'  && <XCircle className="w-3 h-3" />}
                      {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[var(--muted)] whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 hover:text-red-500 text-[var(--muted)] transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalCount > PAGE_SIZE && (
          <div className="flex flex-col gap-2 px-4 sm:px-5 py-3 border-t border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--muted)]">
              Page {page + 1} of {totalPages} · {totalCount.toLocaleString()} total
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:bg-[var(--secondary)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:bg-[var(--secondary)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send form modal */}
      <AnimatePresence>
        {showSendForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowSendForm(false) }}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
              className="bg-[var(--surface)] rounded-2xl p-4 sm:p-6 w-full max-w-md border border-[var(--border)] shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[var(--foreground)]">Queue test message</h3>
                <button onClick={() => setShowSendForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]">
                  <X className="w-4 h-4 text-[var(--muted)]" />
                </button>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Phone number</span>
                  <input value={sendNumber} onChange={e => setSendNumber(e.target.value)}
                    placeholder="+919999999999"
                    className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm font-mono text-[var(--foreground)] outline-none focus:border-green-500 transition-colors" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Message</span>
                  <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={4}
                    placeholder="Type your message…"
                    className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-green-500 transition-colors resize-none" />
                </label>
                {sendError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{sendError}</p>}
              </div>
              <div className="flex flex-wrap justify-end gap-2 mt-5">
                <button onClick={() => setShowSendForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors">Cancel</button>
                <button onClick={handleSend} disabled={sending || !sendNumber.trim() || !sendMessage.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Queuing…' : 'Queue message'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk CSV Send modal */}
      <AnimatePresence>
        {showBulkForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowBulkForm(false) }}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
              className="bg-[var(--surface)] rounded-2xl p-4 sm:p-6 w-full max-w-lg border border-[var(--border)] shadow-2xl max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--foreground)]">Bulk send</h3>
                <button onClick={() => setShowBulkForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]">
                  <X className="w-4 h-4 text-[var(--muted)]" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-[var(--secondary)] mb-5">
                <button onClick={() => setBulkTab('file')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${bulkTab === 'file' ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">Upload</span>
                  <span className="hidden sm:inline">Upload CSV / Excel</span>
                </button>
                <button onClick={() => setBulkTab('ai')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${bulkTab === 'ai' ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">AI</span>
                  <span className="hidden sm:inline">Smart extract (AI)</span>
                </button>
                <button onClick={() => setBulkTab('leads')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${bulkTab === 'leads' ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  Leads
                </button>
              </div>

              {/* ── CSV / File tab ── */}
              {bulkTab === 'file' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">1. Upload file</span>
                    <label className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${bulkParsing ? 'border-blue-300 bg-blue-50' : 'border-[var(--border)] hover:border-blue-400 hover:bg-blue-50/50'}`}>
                      {bulkParsing ? (
                        <><div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /><span className="text-sm text-blue-600 font-medium">Parsing…</span></>
                      ) : bulkRawRows.length > 0 ? (
                        <><FileText className="w-6 h-6 text-green-600" /><span className="text-sm font-semibold text-green-700">{bulkRawRows.length.toLocaleString()} rows loaded</span><span className="text-xs text-[var(--muted)]">Click to upload a different file</span></>
                      ) : (
                        <><Upload className="w-6 h-6 text-[var(--muted)]" /><span className="text-sm text-[var(--muted)]">Click to upload CSV or Excel file</span><span className="text-xs text-[var(--muted)]">.csv, .xlsx, .xls</span></>
                      )}
                      <input ref={bulkFileRef} type="file" accept=".csv,.xlsx,.xls,.tsv" onChange={handleBulkFile} className="hidden" />
                    </label>
                  </div>
                  {bulkHeaders.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">2. Map columns</span>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-xs font-medium text-[var(--muted)] flex items-center gap-1 mb-1"><Users className="w-3 h-3" />Phone column *</span>
                          <div className="relative">
                            <select value={bulkPhoneCol} onChange={e => setBulkPhoneCol(e.target.value)}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-blue-500 appearance-none">
                              <option value="">— select —</option>
                              {bulkHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                          </div>
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium text-[var(--muted)] flex items-center gap-1 mb-1"><FileText className="w-3 h-3" />Name column (optional)</span>
                          <div className="relative">
                            <select value={bulkNameCol} onChange={e => setBulkNameCol(e.target.value)}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-blue-500 appearance-none">
                              <option value="">— none —</option>
                              {bulkHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                          </div>
                        </label>
                      </div>
                      {bulkPhoneCol && (
                        <div className="mt-2 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                          <p className="text-xs font-semibold text-[var(--muted)] mb-1.5">Preview (first 3)</p>
                          <div className="space-y-1">
                            {bulkRawRows.slice(0, 3).map((row, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-[var(--foreground)]">{row[bulkPhoneCol] || '—'}</span>
                                {bulkNameCol && <span className="text-[var(--muted)]">· {row[bulkNameCol] || '—'}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {bulkHeaders.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">3. Message</span>
                      <p className="text-xs text-[var(--muted)] mb-2">Use <code className="bg-[var(--secondary)] px-1 rounded">{'{{name}}'}</code> for personalization</p>
                      <textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} rows={5}
                        placeholder="Hi {{name}}, this is from Levitate…"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors resize-none" />
                    </div>
                  )}
                  {bulkHeaders.length > 0 && bulkPhoneCol && bulkMessage.trim() && (
                    <div>
                      <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">4. Preview &amp; edit per contact</span>
                      <ContactPreviewList
                        contacts={bulkRawRows.map(row => ({ phone: row[bulkPhoneCol] ?? '', name: bulkNameCol ? (row[bulkNameCol] ?? '') : '' }))}
                        template={bulkMessage}
                        overrides={bulkOverrides}
                        onOverrideChange={(key, message) => setBulkOverrides(prev => {
                          const next = { ...prev }
                          if (message === null) delete next[key]
                          else next[key] = message
                          return next
                        })}
                      />
                    </div>
                  )}
                  {bulkError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{bulkError}</p>}
                  {bulkResult && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                      <p className="text-sm font-semibold text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{bulkResult.queued.toLocaleString()} messages queued!</p>
                      {bulkResult.skipped > 0 && <p className="text-xs text-green-600 mt-0.5">{bulkResult.skipped} skipped (invalid numbers)</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button onClick={() => setShowBulkForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors">{bulkResult ? 'Done' : 'Cancel'}</button>
                    {!bulkResult && (
                      <button onClick={handleBulkQueue}
                        disabled={bulkQueuing || !bulkPhoneCol || !bulkMessage.trim() || bulkRawRows.length === 0}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <Send className="w-3.5 h-3.5" />
                        {bulkQueuing ? 'Queuing…' : `Queue ${bulkRawRows.length.toLocaleString()} messages`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── AI Smart Extract tab ── */}
              {bulkTab === 'ai' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">1. Paste any text</span>
                    <p className="text-xs text-[var(--muted)] mb-2">Paste raw notes, a WhatsApp export, a copied spreadsheet, emails — AI will extract all phone numbers and names automatically.</p>
                    <textarea value={aiRawText} onChange={e => setAiRawText(e.target.value)} rows={7}
                      placeholder={"Rahul Sharma — 9876543210\nPriya: +91 98765 43211\nAnkit Mehta, Delhi, 7788990011\n...\n(any format works)"}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-purple-500 transition-colors resize-none font-mono" />
                    <button onClick={handleAiExtract} disabled={aiExtracting || !aiRawText.trim()}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                      {aiExtracting ? 'Extracting with AI…' : 'Extract numbers with AI'}
                    </button>
                  </div>

                  {aiExtracted.length > 0 && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">2. Extracted contacts ({aiExtracted.length})</span>
                          <button onClick={() => { setAiExtracted([]); setAiResult(null); setAiOverrides({}) }}
                            className="text-xs text-[var(--muted)] hover:text-red-500 transition-colors">Clear</button>
                        </div>
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] divide-y divide-[var(--border)]">
                          {aiExtracted.map((c, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-xs group">
                              <div className="min-w-0 flex-1 truncate">
                                <span className="font-mono text-[var(--foreground)]">{c.phone}</span>
                                <span className="text-[var(--muted)] ml-1.5">{c.name || <em className="opacity-50">no name</em>}</span>
                              </div>
                              <button onClick={() => setAiExtracted(prev => prev.filter((_, j) => j !== i))}
                                className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 rounded text-[var(--muted)] hover:text-red-500 transition-all">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">3. Message</span>
                        <p className="text-xs text-[var(--muted)] mb-2">Use <code className="bg-[var(--secondary)] px-1 rounded">{'{{name}}'}</code> for personalization</p>
                        <textarea value={aiMessage} onChange={e => setAiMessage(e.target.value)} rows={5}
                          placeholder="Hi {{name}}, this is from Levitate…"
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-purple-500 transition-colors resize-none" />
                      </div>

                      {aiMessage.trim() && (
                        <div>
                          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">4. Preview &amp; edit per contact</span>
                          <ContactPreviewList
                            contacts={aiExtracted}
                            template={aiMessage}
                            overrides={aiOverrides}
                            onOverrideChange={(key, message) => setAiOverrides(prev => {
                              const next = { ...prev }
                              if (message === null) delete next[key]
                              else next[key] = message
                              return next
                            })}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {aiError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{aiError}</p>}

                  {aiResult && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                      <p className="text-sm font-semibold text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{aiResult.queued.toLocaleString()} messages queued!</p>
                      {aiResult.skipped > 0 && <p className="text-xs text-green-600 mt-0.5">{aiResult.skipped} skipped (invalid numbers)</p>}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button onClick={() => setShowBulkForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors">{aiResult ? 'Done' : 'Cancel'}</button>
                    {!aiResult && aiExtracted.length > 0 && (
                      <button onClick={handleAiQueue}
                        disabled={aiQueuing || !aiMessage.trim()}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <Send className="w-3.5 h-3.5" />
                        {aiQueuing ? 'Queuing…' : `Queue ${aiExtracted.length} messages`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Load from Leads tab ── */}
              {bulkTab === 'leads' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">1. Search the lead database</span>
                    <p className="text-xs text-[var(--muted)] mb-2">Describe who you want in plain English — e.g. "restaurants in Patna", "clinics with no website".</p>
                    <div className="flex gap-2">
                      <input
                        value={leadsQuery}
                        onChange={e => setLeadsQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleLeadsSearch() }}
                        placeholder="restaurants in Patna"
                        className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-green-500 transition-colors"
                      />
                      <button onClick={handleLeadsSearch} disabled={leadsSearching || !leadsQuery.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {leadsSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        {leadsSearching ? 'Searching…' : 'Search'}
                      </button>
                    </div>
                    {leadsSearchError && <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{leadsSearchError}</p>}
                  </div>

                  {leadsReply && (
                    <p className="text-xs text-[var(--muted)] bg-[var(--background)] rounded-xl border border-[var(--border)] px-3 py-2">{leadsReply}</p>
                  )}

                  {leadsResults.length > 0 && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                            2. Select contacts ({leadsSelected.size} of {leadsResults.length} with phone number)
                          </span>
                          <button
                            onClick={() => setLeadsSelected(prev => prev.size === leadsResults.length ? new Set() : new Set(leadsResults.map(l => l.id)))}
                            className="text-xs text-[var(--muted)] hover:text-green-600 transition-colors"
                          >
                            {leadsSelected.size === leadsResults.length ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] divide-y divide-[var(--border)]">
                          {leadsResults.map(l => (
                            <label key={l.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-[var(--secondary)]">
                              <input
                                type="checkbox"
                                checked={leadsSelected.has(l.id)}
                                onChange={() => setLeadsSelected(prev => {
                                  const next = new Set(prev)
                                  if (next.has(l.id)) next.delete(l.id)
                                  else next.add(l.id)
                                  return next
                                })}
                                className="rounded border-[var(--border)] shrink-0"
                              />
                              <span className="font-mono text-[var(--foreground)] shrink-0">{l.phone}</span>
                              <span className="text-[var(--muted)] truncate min-w-0">{l.name}{l.city ? ` · ${l.city}` : ''}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">3. Message</span>
                        <p className="text-xs text-[var(--muted)] mb-2">Use <code className="bg-[var(--secondary)] px-1 rounded">{'{{name}}'}</code> for personalization</p>
                        <textarea value={leadsMessage} onChange={e => setLeadsMessage(e.target.value)} rows={5}
                          placeholder="Hi {{name}}, this is from Levitate…"
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-green-500 transition-colors resize-none" />
                      </div>

                      {leadsMessage.trim() && (
                        <div>
                          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">4. Preview &amp; edit per contact</span>
                          <ContactPreviewList
                            contacts={leadsResults.filter(l => leadsSelected.has(l.id)).map(l => ({ phone: l.phone, name: l.name }))}
                            template={leadsMessage}
                            overrides={leadsOverrides}
                            onOverrideChange={(key, message) => setLeadsOverrides(prev => {
                              const next = { ...prev }
                              if (message === null) delete next[key]
                              else next[key] = message
                              return next
                            })}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {leadsQueueError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{leadsQueueError}</p>}

                  {leadsResult && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                      <p className="text-sm font-semibold text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{leadsResult.queued.toLocaleString()} messages queued!</p>
                      {leadsResult.skipped > 0 && <p className="text-xs text-green-600 mt-0.5">{leadsResult.skipped} skipped (invalid numbers)</p>}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button onClick={() => setShowBulkForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors">{leadsResult ? 'Done' : 'Cancel'}</button>
                    {!leadsResult && leadsResults.length > 0 && (
                      <button onClick={handleLeadsQueue}
                        disabled={leadsQueuing || !leadsMessage.trim() || leadsSelected.size === 0}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <Send className="w-3.5 h-3.5" />
                        {leadsQueuing ? 'Queuing…' : `Queue ${leadsSelected.size} message${leadsSelected.size === 1 ? '' : 's'}`}
                      </button>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear confirm */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmClear(false) }}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[var(--surface)] rounded-2xl p-4 sm:p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl">
              <h3 className="font-semibold text-[var(--foreground)] mb-2">Clear history?</h3>
              <p className="text-sm text-[var(--muted)] mb-5">Removes all sent and failed messages. Pending messages are preserved.</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button onClick={() => setConfirmClear(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors">Cancel</button>
                <button onClick={clearHistory} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">Clear history</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear pending confirm */}
      <AnimatePresence>
        {confirmClearPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmClearPending(false) }}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[var(--surface)] rounded-2xl p-4 sm:p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl">
              <h3 className="font-semibold text-[var(--foreground)] mb-2">Cancel all pending messages?</h3>
              <p className="text-sm text-[var(--muted)] mb-5">
                Permanently cancels <strong>{dbStats.pending.toLocaleString()}</strong> message{dbStats.pending === 1 ? '' : 's'} that {dbStats.pending === 1 ? 'has' : 'have'} not been sent yet
                {companyFilter === 'admin' ? ' (admin-only view)' : ''}. This cannot be undone — sent and failed messages are not affected.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button onClick={() => setConfirmClearPending(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors">Cancel</button>
                <button
                  onClick={clearPending}
                  disabled={clearingPending}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {clearingPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  {clearingPending ? 'Cancelling…' : `Cancel ${dbStats.pending.toLocaleString()} pending`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
