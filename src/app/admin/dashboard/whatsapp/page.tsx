'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Server, Wifi, WifiOff, AlertTriangle, Send, Clock, CheckCircle2, XCircle, Trash2, MessageSquareText } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function WhatsAppAdmin() {
  const [status, setStatus] = useState<'checking' | 'offline' | 'needs_auth' | 'connected'>('checking')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [queue, setQueue] = useState<any[]>([])
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, dailyLimit: 20, sentToday: 0 })
  const supabase = createClient()

  const fetchQueue = async () => {
    const { data } = await supabase
      .from('whatsapp_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      setQueue(data)
      setStats(s => ({
        ...s,
        pending: data.filter(m => m.status === 'pending').length,
        sent: data.filter(m => m.status === 'sent').length,
        failed: data.filter(m => m.status === 'failed').length,
      }))
    }
  }

  const sendTestMessage = async () => {
    const number = window.prompt('Enter phone number with country code (e.g. +919999999999):')
    if (!number) return
    await supabase.from('whatsapp_queue').insert({
      to_number: number,
      message: 'Hi, hope you are doing well. This is a test message from Levitate Labs to confirm our WhatsApp connection is working correctly. Please disregard.',
      status: 'pending'
    })
    fetchQueue()
  }

  const clearQueue = async () => {
    if (confirm('Delete all queue history? This cannot be undone.')) {
      await supabase.from('whatsapp_queue').delete().neq('status', 'placeholder')
      fetchQueue()
    }
  }

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('http://localhost:3005/api/status')
        if (res.ok) {
          const data = await res.json()
          setStats(s => ({ ...s, sentToday: data.sentToday ?? 0, dailyLimit: data.dailyLimit ?? 20 }))
          if (data.ready) setStatus('connected')
          else { setStatus('needs_auth'); fetchQR() }
        } else { setStatus('offline') }
      } catch { setStatus('offline') }
    }

    const fetchQR = async () => {
      try {
        const res = await fetch('http://localhost:3005/api/qr')
        const data = await res.json()
        if (data.qr) setQrCode(data.qr)
      } catch {}
    }

    checkServer()
    fetchQueue()
    const interval = setInterval(() => { checkServer(); fetchQueue() }, 6000)
    return () => clearInterval(interval)
  }, [])

  const isConnected = status === 'connected'
  const isOffline = status === 'offline'

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
            <MessageSquareText className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">WhatsApp Bridge</h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">Local device link for zero-cost automated outreach</p>
          </div>
        </div>
        <button
          onClick={sendTestMessage}
          disabled={!isConnected}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isConnected
              ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20'
              : 'bg-[var(--secondary)] text-[var(--muted)] cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          Test Send
        </button>
      </div>

      {/* Daily Usage Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">Daily Messages</span>
          <span className="text-sm font-bold text-[var(--foreground)]">{stats.sentToday} / {stats.dailyLimit}</span>
        </div>
        <div className="h-2 bg-[var(--secondary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.min((stats.sentToday / stats.dailyLimit) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-[var(--muted)] mt-1.5">Anti-ban: max {stats.dailyLimit} messages/day with 45–90 second random delays</p>
      </div>

      {/* Status + Auth Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Local Daemon Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-[var(--secondary)]">
              <Server className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">Local Daemon</p>
              <p className="text-xs text-[var(--muted)]">http://localhost:3005</p>
            </div>
            <div className="ml-auto">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                isOffline
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-green-500/15 text-green-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-400' : 'bg-green-400'}`} />
                {isOffline ? 'Offline' : 'Online'}
              </span>
            </div>
          </div>

          {isOffline ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-400 mb-1">Daemon not running</p>
                  <p className="text-xs text-amber-400/80">Double-click <code className="bg-amber-500/20 px-1 py-0.5 rounded">Start_WhatsApp.bat</code> on your PC to go live.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Connected to API</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-[var(--secondary)] text-center">
                  <p className="text-lg font-bold text-amber-400">{stats.pending}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Pending</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--secondary)] text-center">
                  <p className="text-lg font-bold text-green-400">{stats.sent}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Sent</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--secondary)] text-center">
                  <p className="text-lg font-bold text-red-400">{stats.failed}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Failed</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-[var(--secondary)]">
              <QrCode className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">Phone Authentication</p>
              <p className="text-xs text-[var(--muted)]">Link your WhatsApp account</p>
            </div>
          </div>

          {isOffline ? (
            <div className="flex items-center justify-center h-36 rounded-xl border-2 border-dashed border-[var(--border)]">
              <p className="text-sm text-[var(--muted)]">Start daemon to authenticate</p>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col items-center justify-center h-36 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
              <p className="font-semibold text-[var(--foreground)]">Ready to Send</p>
              <p className="text-xs text-[var(--muted)] mt-1">Polling active every 60 seconds</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-xl">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-40 h-40" />
              </div>
              <p className="text-xs text-center text-[var(--muted)]">
                Open WhatsApp &rarr; Linked Devices &rarr; Link a Device
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-36 gap-3">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-[var(--border)] border-t-green-500" />
              <p className="text-sm text-[var(--muted)]">Generating QR code...</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Queue Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">Message Queue</h2>
          <button
            onClick={clearQueue}
            title="Clear history"
            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">To Number</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Message</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Status</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-[var(--muted)]">
                    No messages in queue yet. They will appear here when a lead is queued for WhatsApp.
                  </td>
                </tr>
              ) : queue.map((msg) => (
                <tr key={msg.id} className="hover:bg-[var(--secondary)] transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-[var(--foreground)]">{msg.to_number}</td>
                  <td className="px-6 py-4 text-sm text-[var(--muted)] max-w-xs">
                    <span className="truncate block" title={msg.message}>{msg.message}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      msg.status === 'sent'    ? 'bg-green-500/15 text-green-400' :
                      msg.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                                                 'bg-red-500/15 text-red-400'
                    }`}>
                      {msg.status === 'sent'    ? <CheckCircle2 className="w-3 h-3" /> :
                       msg.status === 'pending' ? <Clock className="w-3 h-3" /> :
                                                  <XCircle className="w-3 h-3" />}
                      {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--muted)] whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
