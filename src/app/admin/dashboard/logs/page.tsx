'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Activity, RefreshCw, Filter, Search, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface AgentLog {
  id: string
  agent_name: string
  action: string
  status: 'success' | 'failure' | 'partial'
  duration_ms?: number
  credits_earned: number
  ai_provider?: string
  error?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  created_at: string
  project_id?: string
  lead_id?: string
}

const AGENT_MARKERS: Record<string, string> = {
  reporter: 'REP',
  bizdev: 'BIZ',
  outreach: 'OUT',
  followup: 'FLW',
  discovery: 'DSC',
  proposal: 'PRP',
  onboarding: 'ONB',
  architect: 'ARC',
  coder: 'DEV',
  reviewer: 'REV',
  tester: 'TST',
  debugger: 'DBG',
  deployer: 'DPL',
  invoice: 'INV',
  retention: 'RET',
  agent_evaluator: 'EVAL',
  kaggle_watchdog: 'KAG',
  supabase_heartbeat: 'DB',
  webhook_handler: 'WH',
  router: 'RTR',
  github_action: 'GH'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isLive, setIsLive] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof createClient> | null>(null)

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(200)
      if (filter !== 'all') query = query.eq('status', filter)
      if (agentFilter !== 'all') query = query.eq('agent_name', agentFilter)

      const { data } = await query
      setLogs(data ?? [])
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filter, agentFilter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Real-time subscription
  useEffect(() => {
    if (!isLive) return

    const supabase = createClient()
    const channel = supabase
      .channel('agent_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_logs' }, (payload) => {
        const newLog = payload.new as AgentLog
        setLogs(prev => [newLog, ...prev.slice(0, 199)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isLive])

  const uniqueAgents = [...new Set(logs.map(l => l.agent_name))].sort()

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (agentFilter !== 'all' && l.agent_name !== agentFilter) return false
    if (search && !l.action.includes(search) && !l.agent_name.includes(search)) return false
    return true
  })

  const successCount = logs.filter(l => l.status === 'success').length
  const failureCount = logs.filter(l => l.status === 'failure').length
  const totalCredits = logs.reduce((s, l) => s + (l.credits_earned ?? 0), 0)

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Activity className="w-7 h-7 text-[var(--primary)]" />
            Live Agent Activity
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Real-time feed of everything every agent does
            {isLive && <span className="ml-2 text-green-400 text-xs">● LIVE</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isLive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}
          >
            {isLive ? '● Live' : '○ Paused'}
          </button>
          <button onClick={loadLogs} className="btn-ghost flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-400" />
          <div>
            <p className="text-xl font-bold text-green-400">{successCount}</p>
            <p className="text-xs text-[var(--muted)]">Successful actions</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-400" />
          <div>
            <p className="text-xl font-bold text-red-400">{failureCount}</p>
            <p className="text-xs text-[var(--muted)]">Failed actions</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Activity className="w-8 h-8 text-yellow-400" />
          <div>
            <p className="text-xl font-bold text-yellow-400">{totalCredits > 0 ? '+' : ''}{totalCredits}</p>
            <p className="text-xs text-[var(--muted)]">Net credits in view</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="pl-9 pr-4 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm w-48"
          />
        </div>

        <div className="flex gap-1">
          {(['all', 'success', 'failure'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${filter === f ? 'bg-[var(--primary)] text-white' : 'bg-[var(--secondary)] text-[var(--muted)]'}`}>
              {f}
            </button>
          ))}
        </div>

        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-xs">
          <option value="all">All Agents</option>
          {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <span className="text-xs text-[var(--muted)]">{filtered.length} entries</span>
      </div>

      {/* Log Feed */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map(log => (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`glass-card p-3 cursor-pointer border-l-4 ${log.status === 'success' ? 'border-l-green-500' : log.status === 'failure' ? 'border-l-red-500' : 'border-l-yellow-500'}`}
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--secondary)] text-[10px] font-semibold tracking-[0.16em] text-[var(--muted)]">
                  {AGENT_MARKERS[log.agent_name] ?? 'AGT'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm capitalize">{log.agent_name.replace(/_/g, ' ')}</span>
                    <span className="text-[var(--muted)] text-xs">→</span>
                    <span className="text-sm text-[var(--foreground)]">{log.action.replace(/_/g, ' ')}</span>
                    {log.credits_earned !== 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${log.credits_earned > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                        {log.credits_earned > 0 ? '+' : ''}{log.credits_earned} cr
                      </span>
                    )}
                    {log.status === 'failure' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-300">FAILED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                    <span><Clock className="w-3 h-3 inline mr-1" />{timeAgo(log.created_at)}</span>
                    {log.duration_ms && <span>{log.duration_ms}ms</span>}
                    {log.ai_provider && <span>via {log.ai_provider}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {log.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : log.status === 'failure' ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedLog === log.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
                    <div className="terminal text-xs p-3 rounded space-y-1">
                      {log.error && <p className="text-red-400">Error: {log.error}</p>}
                      {log.input && Object.keys(log.input).length > 0 && (
                        <p className="text-gray-400">Input: {JSON.stringify(log.input, null, 2).slice(0, 300)}</p>
                      )}
                      {log.output && Object.keys(log.output).length > 0 && (
                        <p className="text-green-400">Output: {JSON.stringify(log.output, null, 2).slice(0, 300)}</p>
                      )}
                      {log.project_id && <p className="text-blue-400">Project: {log.project_id}</p>}
                      {log.lead_id && <p className="text-purple-400">Lead: {log.lead_id}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && !isLoading && (
          <div className="text-center py-12 text-[var(--muted)]">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No activity yet. Agents will log here as they run.</p>
            <p className="text-xs mt-1">First activity: 6:00 AM IST when BizDev agent runs.</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  )
}
