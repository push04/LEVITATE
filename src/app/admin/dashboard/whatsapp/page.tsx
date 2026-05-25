'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server, Send, Clock, CheckCircle2, XCircle,
  Trash2, RefreshCw, X, RotateCcw, Activity,
  MessageSquare, Building2, AlertTriangle, Wifi,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

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
  const [companyFilter, setCompanyFilter] = useState<'all' | 'admin'>('all')

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from('whatsapp_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) {
      const q = data as QueueMsg[]
      setQueue(q)
      setDbStats({
        pending: q.filter(m => m.status === 'pending').length,
        sent:    q.filter(m => m.status === 'sent').length,
        failed:  q.filter(m => m.status === 'failed').length,
      })
    }
  }, [supabase])

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
    const interval = setInterval(() => {
      fetchDaemonStatus()
      fetchQueue()
    }, 6000)
    return () => clearInterval(interval)
  }, [fetchDaemonStatus, fetchQueue])

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
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to queue message')
    } finally {
      setSending(false)
    }
  }

  const retryFailed = async () => {
    const ids = queue.filter(m => m.status === 'failed').map(m => m.id)
    if (!ids.length) return
    await supabase
      .from('whatsapp_queue')
      .update({ status: 'pending', error: null, updated_at: new Date().toISOString() })
      .in('id', ids)
    fetchQueue()
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('whatsapp_queue').delete().eq('id', id)
    setQueue(prev => prev.filter(m => m.id !== id))
  }

  const clearHistory = async () => {
    await supabase.from('whatsapp_queue').delete().in('status', ['sent', 'failed'])
    setConfirmClear(false)
    fetchQueue()
  }

  const isConnected = daemonStatus === 'connected'
  const isOffline = daemonStatus === 'offline'

  const displayQueue = companyFilter === 'admin'
    ? queue.filter(m => !m.company_id)
    : queue

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">WhatsApp Bridge</h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">Shared local daemon — admin + business outreach</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isConnected ? 'bg-green-50 text-green-700 border-green-200' :
            isOffline   ? 'bg-red-50 text-red-600 border-red-200' :
            daemonStatus === 'checking' ? 'bg-[var(--secondary)] text-[var(--muted)] border-[var(--border)]' :
            'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : isOffline ? 'bg-red-500' : 'bg-amber-400'}`} />
            {daemonStatus === 'checking' ? 'Checking' : daemonStatus === 'connected' ? 'Connected' : daemonStatus === 'needs_auth' ? 'Needs auth' : 'Offline'}
          </span>
        </div>
        <div className="flex gap-2">
          {dbStats.failed > 0 && (
            <button onClick={retryFailed}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Retry failed ({dbStats.failed})
            </button>
          )}
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: dbStats.pending, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Sent',    value: dbStats.sent,    cls: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Failed',  value: dbStats.failed,  cls: 'bg-red-50 border-red-200 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-2xl border text-center ${s.cls}`}>
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{s.label}</p>
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
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-2 rounded-xl border border-[var(--border)]">
                <img src={qrCode} alt="QR Code" className="w-36 h-36" />
              </div>
              <p className="text-xs text-center text-[var(--muted)]">WhatsApp → Linked Devices → Link a Device</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 gap-2">
              <div className="w-6 h-6 border-2 border-[var(--border)] border-t-green-500 rounded-full animate-spin" />
              <p className="text-sm text-[var(--muted)]">Generating QR…</p>
            </div>
          )}
        </div>
      </div>

      {/* Queue table */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm text-[var(--foreground)]">Message Queue</h2>
          <span className="text-xs text-[var(--muted)] bg-[var(--secondary)] rounded-full px-2 py-0.5 tabular-nums">{queue.length}</span>
          <div className="flex gap-1 ml-3">
            {(['all', 'admin'] as const).map(f => (
              <button key={f} onClick={() => setCompanyFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${companyFilter === f ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--muted)] hover:bg-[var(--secondary)]'}`}>
                {f === 'all' ? 'All' : 'Admin only'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1.5">
            <button onClick={fetchQueue} className="p-1.5 rounded-lg hover:bg-[var(--secondary)] transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
            </button>
            <button onClick={() => setConfirmClear(true)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-[var(--muted)] transition-colors" title="Clear history">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                {['Number', 'Message', 'Source', 'Status', 'Time', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {displayQueue.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-[var(--muted)]">No messages in queue</td></tr>
              ) : displayQueue.map(msg => (
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
      </div>

      {/* Send form modal */}
      <AnimatePresence>
        {showSendForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowSendForm(false) }}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
              className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md border border-[var(--border)] shadow-2xl">
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
              <div className="flex justify-end gap-2 mt-5">
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

      {/* Clear confirm */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmClear(false) }}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl">
              <h3 className="font-semibold text-[var(--foreground)] mb-2">Clear history?</h3>
              <p className="text-sm text-[var(--muted)] mb-5">Removes all sent and failed messages. Pending messages are preserved.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmClear(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors">Cancel</button>
                <button onClick={clearHistory} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">Clear history</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
