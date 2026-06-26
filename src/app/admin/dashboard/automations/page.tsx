'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Bot, Activity, Clock, TrendingUp, AlertTriangle,
  Cpu, RefreshCw, ChevronDown, CheckCircle, XCircle,
  Play, Filter, Search, BarChart3, Wifi, WifiOff, Eye,
  Users, ArrowRight, MapPin, Star, Mail, Inbox, Send, FileText
} from 'lucide-react'
import OutreachTemplateManager from '@/components/admin/OutreachTemplateManager'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentData {
  agent_name: string
  label?: string
  schedule?: string
  current_balance: number
  total_earned?: number
  tasks_completed?: number
  tasks_failed?: number
  success_rate: number
  is_suspended: boolean
  suspension_reason?: string
  tasks_last_24h: number
  success_last_24h: number
  failed_last_24h: number
  last_log?: { action: string; status: string; created_at: string } | null
}

interface Schedule {
  agent: string
  schedule: string
  cron: string
  next_run: string
}

interface LogEntry {
  id?: string
  agent_name: string
  action: string
  status: string
  credits_earned: number
  created_at: string
  duration_ms?: number | null
  output?: any
  input?: any
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_NAMES: Record<string, string> = {
  reporter:           'Vikram Singh (Analytics Engine)',
  bizdev:             'Aditi Kapoor (Lead Scout)',
  outreach:           'Neha Sharma (Head of Growth)',
  followup:           'Rahul Desai (Client Relations)',
  discovery:          'Kavya Patel (Qualification Rep)',
  proposal:           'Siddharth Menon (Deal Desk)',
  onboarding:         'Meera Reddy (Client Success)',
  architect:          'Arjun Nair (Systems Architect)',
  coder:              'Ayaan Khan (Full Stack Dev)',
  reviewer:           'Priya Gupta (QA Lead)',
  tester:             'Karan Singh (Automation Tester)',
  debugger:           'Sneha Rao (DevOps)',
  deployer:           'Rohan Iyer (Release Manager)',
  invoice:            'Pooja Sharma (Accounts Receivable)',
  retention:          'Ananya Das (Client Retention)',
  agent_evaluator:    'Arvind Kumar (Performance Manager)'
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  reporter:           'Sends status emails to founder every 30 minutes',
  bizdev:             'Scans Google Maps and JustDial for leads every 2 hours',
  research:           'Market research, competitor analysis, lead enrichment every 15 minutes',
  outreach:           'Sends personalized cold emails to hot leads every 15 minutes',
  followup:           'Day 3 and Day 7 follow-up emails every 15 minutes',
  discovery:          'Qualifies leads via email replies (triggered)',
  proposal:           'Generates proposals and Razorpay payment links (triggered)',
  onboarding:         'Onboards new paying clients automatically (triggered)',
  architect:          'Designs website architecture before coding (triggered)',
  coder:              'Builds websites via GitHub Actions pipeline (triggered)',
  reviewer:           'Reviews code quality before deployment (triggered)',
  tester:             'Runs automated tests on staging sites (triggered)',
  debugger:           'Auto-fixes failing tests (triggered)',
  deployer:           'Deploys to Edge Platform on client workspace route (triggered)',
  invoice:            'Chases overdue payments via email every 30 minutes',
  retention:          'Re-engages past clients every 12 hours',
  agent_evaluator:    'Performance review and credit distribution every 6 hours',
  supabase_heartbeat: 'Keeps Supabase database alive daily'
}

const AGENT_COLORS: Record<string, string> = {
  reporter:        'text-blue-600',
  research:        'text-purple-600',
  outreach:        'text-green-600',
  followup:        'text-amber-600',
  bizdev:          'text-orange-600',
  invoice:         'text-red-600',
  retention:       'text-pink-600',
  agent_evaluator: 'text-cyan-600',
  discovery:       'text-teal-600',
  proposal:        'text-indigo-600',
  onboarding:      'text-emerald-600',
  coder:           'text-violet-600',
  deployer:        'text-amber-700'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTier(balance: number): { label: string; color: string } {
  if (balance >= 1000) return { label: 'LEGENDARY', color: 'bg-amber-50 text-amber-700 border border-amber-200' }
  if (balance >= 500)  return { label: 'ELITE',     color: 'bg-violet-50 text-violet-700 border border-violet-200' }
  if (balance >= 200)  return { label: 'PERFORMING',color: 'bg-blue-50 text-blue-700 border border-blue-200' }
  if (balance >= 50)   return { label: 'NORMAL',    color: 'bg-gray-100 text-gray-600 border border-gray-200' }
  return { label: 'PROBATION', color: 'bg-red-50 text-red-700 border border-red-200' }
}

function statusDot(agent: AgentData) {
  if (agent.is_suspended) return 'bg-red-500'
  if (agent.failed_last_24h > agent.success_last_24h) return 'bg-yellow-500'
  if (agent.tasks_last_24h > 0) return 'bg-green-500'
  return 'bg-gray-500'
}

function formatRelativeTime(isoString: string) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(isoString).toLocaleDateString('en-IN')
}

function getActionIcon(action: string): ReactNode {
  const normalized = action.toLowerCase()
  const className = 'w-4 h-4'

  if (normalized.includes('email') || normalized.includes('outreach')) return <Mail className={className} />
  if (normalized.includes('research') || normalized.includes('scan') || normalized.includes('enrich')) return <Search className={className} />
  if (normalized.includes('follow')) return <RefreshCw className={className} />
  if (normalized.includes('lead') || normalized.includes('bizdev')) return <Users className={className} />
  if (normalized.includes('payment') || normalized.includes('invoice')) return <TrendingUp className={className} />
  if (normalized.includes('report') || normalized.includes('status')) return <BarChart3 className={className} />
  if (normalized.includes('deploy')) return <ArrowRight className={className} />
  if (normalized.includes('code') || normalized.includes('build')) return <Cpu className={className} />
  if (normalized.includes('test')) return <CheckCircle className={className} />
  if (normalized.includes('proposal')) return <Send className={className} />
  if (normalized.includes('heartbeat') || normalized.includes('ping')) return <Wifi className={className} />
  return <Activity className={className} />
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [agents, setAgents]       = useState<AgentData[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'agents' | 'logs' | 'analytics' | 'pipeline' | 'emails' | 'templates'>('agents')

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agents')
      const { data } = await res.json()
      setAgents(data.agents ?? [])
      setSchedules(data.schedules ?? [])
    } catch (err) {
      console.error('Failed to load agent data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAgents()
    const interval = setInterval(loadAgents, 30000)
    return () => clearInterval(interval)
  }, [loadAgents])

  const agentAction = async (agentName: string, action: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActionLoading(`${agentName}-${action}`)
    try {
      await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, agentName })
      })
      await loadAgents()
    } finally {
      setActionLoading(null)
    }
  }

  const totalCredits = agents.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const suspended    = agents.filter(a => a.is_suspended).length
  const active24h    = agents.filter(a => a.tasks_last_24h > 0).length
  const avgSuccess   = agents.length > 0
    ? Math.round(agents.reduce((s, a) => s + (a.success_rate ?? 100), 0) / agents.length)
    : 100
  const neverRun     = agents.filter(a => !a.last_log).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--muted)] text-sm">Loading automation network...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-[var(--primary)]" />
            Automation Control Center
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            {agents.length} agents fully operational
          </p>
        </div>
        <button onClick={loadAgents} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>



      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Total Credits</p>
          <p className="text-2xl font-bold text-amber-600">{totalCredits.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted)] mt-1">economy balance</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Avg Success</p>
          <p className={`text-2xl font-bold ${avgSuccess >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{avgSuccess}%</p>
          <p className="text-xs text-[var(--muted)] mt-1">all time</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Active (24h)</p>
          <p className="text-2xl font-bold text-blue-600">{active24h}</p>
          <p className="text-xs text-[var(--muted)] mt-1">of {agents.length} agents</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Suspended</p>
          <p className={`text-2xl font-bold ${suspended > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{suspended}</p>
          <p className="text-xs text-[var(--muted)] mt-1">{suspended === 0 ? 'all clear' : 'need attention'}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Never Run</p>
          <p className={`text-2xl font-bold ${neverRun > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{neverRun}</p>
          <p className="text-xs text-[var(--muted)] mt-1">agents idle</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--secondary)] rounded-xl p-1 w-fit flex-wrap">
        {(['agents', 'logs', 'pipeline', 'analytics', 'emails', 'templates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            {tab === 'logs' ? 'Live Logs' : tab === 'analytics' ? 'Analytics' : tab === 'pipeline' ? 'Leads Pipeline' : tab === 'emails' ? 'Emails' : tab === 'templates' ? 'Templates' : 'Agents'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'agents' && (
        <>
          {/* AI Status */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="font-semibold text-sm">Primary Intelligence Cluster</p>
                  <p className="text-xs text-[var(--muted)]">Active</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span>
            </div>
          </div>

          {/* Agent Grid */}
          <div>
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--primary)]" />
              Agent Network
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {agents.map((agent) => {
                const tier  = getTier(agent.current_balance)
                const sched = schedules.find(s => s.agent === agent.agent_name)
                const isExpanded = expandedAgent === agent.agent_name
                const neverRanThis = !agent.last_log

                return (
                  <div
                    key={agent.agent_name}
                    className={`glass-card p-4 cursor-pointer hover:border-[var(--primary)]/40 transition-colors ${neverRanThis ? 'border-orange-800/40' : ''}`}
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.agent_name)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusDot(agent)} flex-shrink-0 mt-0.5`} />
                        <div>
                          <p className="font-medium text-sm">
                            {AGENT_NAMES[agent.agent_name] ?? agent.label ?? agent.agent_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tier.color}`}>
                            {tier.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${agent.current_balance >= 100 ? 'text-emerald-600' : agent.current_balance >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {agent.current_balance} cr
                        </p>
                        <ChevronDown className={`w-3 h-3 text-[var(--muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                      {AGENT_DESCRIPTIONS[agent.agent_name] ?? 'Automated agent'}
                    </p>

                    <div className="flex items-center justify-between mt-3 text-xs text-[var(--muted)]">
                      <span>Success: <span className="text-gray-800 font-medium">{Math.round(agent.success_rate)}%</span></span>
                      <span>24h: <span className="text-gray-800 font-medium">{agent.tasks_last_24h} tasks</span></span>
                      {neverRanThis
                        ? <span className="text-orange-600 font-medium">Never ran</span>
                        : <span className="text-[var(--muted)]">{formatRelativeTime(agent.last_log!.created_at)}</span>
                      }
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                            {sched && (
                              <p className="text-xs text-[var(--muted)]">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {sched.schedule} — next: {sched.next_run}
                              </p>
                            )}
                            {agent.last_log && (
                              <div className="text-xs text-[var(--muted)]">
                                <p>Last: <span className={agent.last_log.status === 'success' ? 'text-emerald-600' : 'text-red-600'}>{agent.last_log.status}</span> — {agent.last_log.action.replace(/_/g, ' ')}</p>
                                <p className="text-[10px] mt-0.5">{new Date(agent.last_log.created_at).toLocaleString('en-IN')}</p>
                              </div>
                            )}
                            {agent.is_suspended && (
                              <p className="text-xs text-red-600">Suspended: {agent.suspension_reason}</p>
                            )}
                            {/* Mini 24h bar */}
                            {agent.tasks_last_24h > 0 && (
                              <div className="text-xs text-[var(--muted)]">
                                <div className="flex gap-1 mt-1">
                                  <div
                                    className="h-1.5 rounded bg-green-500"
                                    style={{ width: `${(agent.success_last_24h / agent.tasks_last_24h) * 100}%` }}
                                  />
                                  <div
                                    className="h-1.5 rounded bg-red-500"
                                    style={{ width: `${(agent.failed_last_24h / agent.tasks_last_24h) * 100}%` }}
                                  />
                                </div>
                                <p className="mt-1">{agent.success_last_24h}✓ {agent.failed_last_24h}✗ in 24h</p>
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              {agent.is_suspended ? (
                                <button
                                  onClick={(e) => agentAction(agent.agent_name, 'unsuspend', e)}
                                  disabled={!!actionLoading}
                                  className="flex-1 text-xs py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                >
                                  {actionLoading === `${agent.agent_name}-unsuspend` ? 'Working...' : 'Unsuspend'}
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => agentAction(agent.agent_name, 'suspend', e)}
                                  disabled={!!actionLoading}
                                  className="flex-1 text-xs py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
                                >
                                  {actionLoading === `${agent.agent_name}-suspend` ? 'Working...' : 'Suspend'}
                                </button>
                              )}
                              <button
                                onClick={(e) => agentAction(agent.agent_name, 'reset_credits', e)}
                                disabled={!!actionLoading}
                                className="flex-1 text-xs py-1.5 rounded bg-gray-600 hover:bg-gray-700 text-white font-medium"
                              >
                                {actionLoading === `${agent.agent_name}-reset_credits` ? 'Working...' : 'Reset Credits'}
                              </button>
                              <button
                                onClick={(e) => agentAction(agent.agent_name, 'trigger', e)}
                                disabled={!!actionLoading}
                                className="flex-1 text-xs py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white font-medium flex items-center justify-center gap-1"
                              >
                                <Play className="w-2.5 h-2.5" />
                                {actionLoading === `${agent.agent_name}-trigger` ? 'Running...' : 'Run Now'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Schedule Table */}
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              Run Schedule
            </h2>
            <div className="divide-y divide-[var(--border)]">
              {schedules.map((s) => (
                <div key={s.agent} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{s.agent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    <p className="text-xs text-[var(--muted)]">{AGENT_DESCRIPTIONS[s.agent] ?? ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-medium text-[var(--primary)]">{s.schedule}</p>
                    <p className="text-xs text-[var(--muted)]">{s.next_run}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'logs' && <LiveLogsTab />}
      {activeTab === 'pipeline' && <PipelineTab />}
      {activeTab === 'analytics' && <AnalyticsTab agents={agents} />}
      {activeTab === 'emails' && <EmailsTab />}
      {activeTab === 'templates' && <OutreachTemplateManager />}

    </div>
  )
}

// ─── Live Logs Tab ─────────────────────────────────────────────────────────────

function LiveLogsTab() {
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter]   = useState<string>('all')
  const [search, setSearch]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isLive, setIsLive]   = useState(true)
  const [newCount, setNewCount] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const isLiveRef = useRef(true)

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/status')
      const data = await res.json()
      if (data.success) {
        const all = data.recent_activity ?? []
        setLogs(all)
      }
    } catch {}
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    loadLogs()

    // Supabase realtime subscription — fires instantly when any agent writes a log
    const channel = supabase
      .channel('agent-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload: { new: LogEntry }) => {
          const newLog = payload.new
          setLogs(prev => [newLog, ...prev].slice(0, 200))
          if (!isLiveRef.current) {
            setNewCount(n => n + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadLogs])

  useEffect(() => {
    isLiveRef.current = isLive
    if (isLive) {
      setNewCount(0)
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [isLive])

  const agentNames = ['all', ...Array.from(new Set(logs.map(l => l.agent_name))).sort()]

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.agent_name !== filter) return false
    if (search && !(l.action ?? '').toLowerCase().includes(search.toLowerCase()) && !(l.agent_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const successCount  = filtered.filter(l => l.status === 'success').length
  const failureCount  = filtered.filter(l => l.status === 'failure').length
  const totalCredits  = filtered.reduce((s, l) => s + (l.credits_earned ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Live indicator */}
        <button
          onClick={() => setIsLive(v => !v)}
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-all ${
            isLive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 text-gray-500'
          }`}
        >
          {isLive ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isLive ? 'Live' : 'Paused'}
          {!isLive && newCount > 0 && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              +{newCount}
            </span>
          )}
        </button>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action..."
            className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        {/* Agent filter */}
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-[var(--secondary)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] appearance-none"
          >
            {agentNames.map(n => (
              <option key={n} value={n}>{n === 'all' ? 'All Agents' : n.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <button onClick={loadLogs} className="btn-ghost text-sm flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{successCount}</p>
          <p className="text-xs text-gray-500">Success</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-red-600">{failureCount}</p>
          <p className="text-xs text-gray-500">Failures</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className={`text-lg font-bold ${totalCredits >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {totalCredits > 0 ? '+' : ''}{totalCredits}
          </p>
          <p className="text-xs text-[var(--muted)]">Credits</p>
        </div>
      </div>

      {/* Log stream */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            Activity Stream
          </h3>
          <span className="text-xs text-[var(--muted)]">{filtered.length} entries</span>
        </div>

        <div ref={listRef} className="max-h-[600px] overflow-y-auto divide-y divide-[var(--border)]/50">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[var(--muted)]">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)]">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">Deploy to Cloud to activate scheduled agents, or trigger manually from the Agents tab.</p>
            </div>
          ) : (
            filtered.map((item, i) => {
              const key = `${item.agent_name}-${item.created_at}-${i}`
              const isExp = expanded === key
              const hasOutput = item.output && Object.keys(item.output).length > 0

              return (
                <div key={key}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--secondary)]/50 transition-colors ${hasOutput ? 'cursor-pointer' : ''}`}
                    onClick={() => hasOutput && setExpanded(isExp ? null : key)}
                  >
                    <span className="text-base flex-shrink-0">{getActionIcon(item.action)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className={`font-semibold ${AGENT_COLORS[item.agent_name] ?? 'text-gray-400'}`}>
                          {(item.agent_name ?? '').replace(/_/g, ' ')}
                        </span>
                        <span className="text-[var(--muted)]"> · {(item.action ?? '').replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {new Date(item.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        {item.duration_ms && ` · ${item.duration_ms}ms`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(item.credits_earned ?? 0) !== 0 && (
                        <span className={`text-xs font-medium ${item.credits_earned > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {item.credits_earned > 0 ? '+' : ''}{item.credits_earned}cr
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        item.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.status === 'failure' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {item.status === 'success' ? <CheckCircle className="w-3 h-3 inline" /> : item.status === 'failure' ? <XCircle className="w-3 h-3 inline" /> : null}
                        {' '}{item.status}
                      </span>
                      {hasOutput && (
                        <Eye className={`w-3.5 h-3.5 text-[var(--muted)] transition-transform ${isExp ? 'opacity-100' : 'opacity-40'}`} />
                      )}
                    </div>
                  </div>

                  {/* Expandable output */}
                  <AnimatePresence>
                    {isExp && hasOutput && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-0">
                          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-700 max-h-48 overflow-y-auto">
                            {JSON.stringify(item.output, null, 2)}
                          </pre>
                          {item.input && Object.keys(item.input).length > 0 && (
                            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-32 overflow-y-auto mt-2">
                              {JSON.stringify(item.input, null, 2)}
                            </pre>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Pipeline Tab ──────────────────────────────────────────────────────────────

interface AutomationLead {
  id: string
  name: string
  city: string
  service_category: string
  ai_score: number | null
  status: string
  phone: string | null
  has_website: boolean | null
  notes: string | null
  created_at: string
  website_link: string | null
}

const STATUS_ORDER = ['New', 'Contacted', 'Follow Up', 'Closed']
const STATUS_COLORS: Record<string, string> = {
  'New':        'bg-blue-50 text-blue-700 border-blue-200',
  'Contacted':  'bg-amber-50 text-amber-700 border-amber-200',
  'Follow Up':  'bg-orange-50 text-orange-700 border-orange-200',
  'Closed':     'bg-emerald-50 text-emerald-700 border-emerald-200',
}
const FUNNEL_COLORS: Record<string, string> = {
  'New': 'bg-blue-500', 'Contacted': 'bg-yellow-500', 'Follow Up': 'bg-orange-500', 'Closed': 'bg-green-500'
}

function PipelineTab() {
  const [leads, setLeads]       = useState<AutomationLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cursor, setCursor]     = useState<{ cursor: number; total_combos: number } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const [leadsRes, cursorRes] = await Promise.all([
          supabase
            .from('leads')
            .select('id, name, city, service_category, ai_score, status, phone, has_website, notes, created_at, website_link')
            .eq('source', 'bizdev_agent')
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('system_config')
            .select('value')
            .eq('key', 'bizdev_cursor')
            .single()
        ])
        setLeads((leadsRes.data ?? []) as AutomationLead[])
        if (cursorRes.data?.value) {
          setCursor(cursorRes.data.value as { cursor: number; total_combos: number })
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('pipeline-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload: { new: AutomationLead & { source: string } }) => {
        const l = payload.new
        if (l.source === 'bizdev_agent') {
          setLeads(prev => [l, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, () => {
        // Reload on any update to reflect status changes
        supabase
          .from('leads')
          .select('id, name, city, service_category, ai_score, status, phone, has_website, notes, created_at, website_link')
          .eq('source', 'bizdev_agent')
          .order('created_at', { ascending: false })
          .limit(100)
          .then(({ data }: { data: AutomationLead[] | null }) => { if (data) setLeads(data) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const byStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length
    return acc
  }, {} as Record<string, number>)

  // Also count any other statuses
  leads.forEach(l => {
    if (!STATUS_ORDER.includes(l.status)) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1
    }
  })

  const total = leads.length
  const rotationPct = cursor ? Math.round((cursor.cursor / cursor.total_combos) * 100) : 0

  const filtered = statusFilter === 'all' ? leads : leads.filter(l => l.status === statusFilter)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Funnel cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUS_ORDER.map(s => {
          const count = byStatus[s] ?? 0
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`glass-card p-4 cursor-pointer transition-all hover:border-[var(--primary)]/40 ${statusFilter === s ? 'border-[var(--primary)]/60' : ''}`}
            >
              <p className="text-xs text-[var(--muted)] mb-1">{s}</p>
              <p className="text-2xl font-bold">{count}</p>
              <div className="mt-2 bg-[var(--secondary)] rounded-full h-1.5">
                <div className={`h-full rounded-full ${FUNNEL_COLORS[s] ?? 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">{pct}% of {total}</p>
            </div>
          )
        })}
      </div>

      {/* BizDev rotation progress */}
      {cursor && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              BizDev Rotation Progress
            </p>
            <span className="text-xs text-[var(--muted)]">{cursor.cursor.toLocaleString()} / {cursor.total_combos.toLocaleString()} combos</span>
          </div>
          <div className="bg-[var(--secondary)] rounded-full h-2.5 overflow-hidden">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${rotationPct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-[var(--muted)]">{rotationPct}% of full cycle covered</p>
            <p className="text-xs text-[var(--muted)]">{cursor.total_combos - cursor.cursor} combos remaining</p>
          </div>
        </div>
      )}

      {/* Leads table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--primary)]" />
            {statusFilter === 'all' ? `All Automation Leads (${total})` : `${statusFilter} (${filtered.length})`}
          </h3>
          {statusFilter !== 'all' && (
            <button onClick={() => setStatusFilter('all')} className="text-xs text-[var(--muted)] hover:text-white">Clear filter</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No leads yet</p>
            <p className="text-xs mt-1">BizDev agent scans every 15 minutes via Overpass/OpenStreetMap</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                  <th className="text-left px-4 py-2 font-medium">Business</th>
                  <th className="text-left px-4 py-2 font-medium">City</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-center px-4 py-2 font-medium">Score</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Found</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/50">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-[var(--secondary)]/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium truncate max-w-[160px]">{lead.name}</p>
                      {lead.phone && <p className="text-xs text-[var(--muted)]">{lead.phone}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{lead.city}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--muted)] capitalize">{lead.service_category}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-bold ${(lead.ai_score ?? 0) >= 8 ? 'text-emerald-600' : (lead.ai_score ?? 0) >= 6 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {lead.ai_score ?? '-'}/10
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {lead.status}
                      </span>
                      {lead.has_website === false && (
                        <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">NO SITE</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--muted)]">
                      {formatRelativeTime(lead.created_at)}
                    </td>
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

// ─── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ agents }: { agents: AgentData[] }) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/status')
      .then(r => r.json())
      .then(data => {
        if (data.success) setAnalytics(data)
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const summary    = analytics?.summary ?? {}
  const agentStats = analytics?.agents ?? []

  // Sort agents by tasks today desc
  const byActivity = [...agentStats].sort((a: any, b: any) => b.tasks_today - a.tasks_today)
  const maxTasks = Math.max(1, byActivity[0]?.tasks_today ?? 1)

  // Leads by status
  const leadsByStatus = analytics?.leads_by_status ?? {}
  const totalLeads = Object.values(leadsByStatus).reduce((a: any, b: any) => a + b, 0) as number

  // Revenue
  const revenue = analytics?.revenue ?? {}

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-600">₹{(revenue.total ?? 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">all time</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Leads Today</p>
          <p className="text-xl font-bold text-blue-600">{summary.leads_today ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">This week: {summary.leads_this_week ?? 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Tasks Today</p>
          <p className="text-xl font-bold text-violet-600">{summary.total_tasks_today ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">by all agents</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-1">Credits Today</p>
          <p className="text-xl font-bold text-amber-600">+{summary.total_credits_earned_today ?? 0}</p>
          <p className="text-xs text-[var(--muted)] mt-1">earned today</p>
        </div>
      </div>

      {/* Agent activity bar chart */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
          Agent Activity (24h) — Tasks Run
        </h3>
        <div className="space-y-2">
          {byActivity.slice(0, 12).map((a: any) => (
            <div key={a.name} className="flex items-center gap-3">
              <p className={`text-xs font-medium w-28 truncate flex-shrink-0 ${AGENT_COLORS[a.name] ?? 'text-gray-400'}`}>
                {a.name.replace(/_/g, ' ')}
              </p>
              <div className="flex-1 bg-[var(--secondary)] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${(a.tasks_today / maxTasks) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[var(--muted)] w-8 text-right">{a.tasks_today}</span>
              {a.tasks_success > 0 && (
                <span className="text-xs text-emerald-600 w-6 text-right">{a.tasks_success}✓</span>
              )}
              {a.tasks_failed > 0 && (
                <span className="text-xs text-red-600 w-6 text-right">{a.tasks_failed}✗</span>
              )}
            </div>
          ))}
          {byActivity.every((a: any) => a.tasks_today === 0) && (
            <p className="text-xs text-[var(--muted)] text-center py-4">No activity in last 24 hours</p>
          )}
        </div>
      </div>

      {/* Leads pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4">Leads Pipeline</h3>
          <div className="space-y-3">
            {Object.entries(leadsByStatus).map(([status, count]) => {
              const c = count as number
              const pct = totalLeads > 0 ? Math.round((c / totalLeads) * 100) : 0
              const color = status === 'Closed' ? 'bg-green-500' : status === 'New' ? 'bg-blue-500' : status === 'Contacted' ? 'bg-yellow-500' : 'bg-orange-500'
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--muted)]">{status}</span>
                    <span className="font-medium">{c} ({pct}%)</span>
                  </div>
                  <div className="bg-[var(--secondary)] rounded-full h-1.5">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="pt-2 border-t border-[var(--border)] flex justify-between">
              <span className="text-sm font-medium">Total Leads</span>
              <span className="font-bold">{totalLeads}</span>
            </div>
          </div>
        </div>

        {/* Agent credits leaderboard */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            Credit Leaderboard
          </h3>
          <div className="space-y-2">
            {[...agents]
              .sort((a, b) => b.current_balance - a.current_balance)
              .slice(0, 8)
              .map((agent, i) => {
                const tier = getTier(agent.current_balance)
                return (
                  <div key={agent.agent_name} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted)] w-4">{i + 1}</span>
                    <p className={`text-xs font-medium flex-1 truncate ${AGENT_COLORS[agent.agent_name] ?? 'text-gray-400'}`}>
                      {(agent.label ?? agent.agent_name).replace(/_/g, ' ')}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tier.color}`}>{tier.label}</span>
                    <span className={`text-xs font-bold ${agent.current_balance >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {agent.current_balance}cr
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Recent revenue */}
      {revenue.recent?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4">Recent Revenue</h3>
          <div className="divide-y divide-[var(--border)]">
            {revenue.recent.map((r: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2">
                <div>
                  <p className="text-sm font-medium">₹{r.amount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-[var(--muted)]">{r.type}</p>
                </div>
                <p className="text-xs text-[var(--muted)]">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Emails Tab ────────────────────────────────────────────────────────────────

interface AgentEmail {
  id: string
  lead_id: string | null
  agent_name: string
  direction: 'inbound' | 'outbound'
  to_email: string | null
  from_email: string | null
  subject: string | null
  body: string | null
  status: string
  created_at: string
}

function EmailsTab() {
  const [emails, setEmails]       = useState<AgentEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [dirFilter, setDirFilter] = useState<'all' | 'outbound' | 'inbound'>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('agent_emails')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        setEmails((data ?? []) as AgentEmail[])
      } catch { } finally { setIsLoading(false) }
    }
    load()
    const ch = supabase
      .channel('agent-emails-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_emails' }, (p: { new: AgentEmail }) => {
        setEmails(prev => [p.new, ...prev].slice(0, 400))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const agents = ['all', ...Array.from(new Set(emails.map(e => e.agent_name)))]
  const filtered = emails
    .filter(e => dirFilter === 'all' || e.direction === dirFilter)
    .filter(e => agentFilter === 'all' || e.agent_name === agentFilter)
  const outCount = emails.filter(e => e.direction === 'outbound').length
  const inCount  = emails.filter(e => e.direction === 'inbound').length

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xs text-[var(--muted)] mb-1">Total</p>
          <p className="text-xl sm:text-2xl font-bold">{emails.length}</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xs text-[var(--muted)] mb-1">Sent by AI</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600">{outCount}</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Received</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">{inCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'outbound', 'inbound'] as const).map(d => (
          <button key={d} onClick={() => setDirFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              dirFilter === d ? 'bg-[var(--primary)] text-white' : 'bg-[var(--secondary)] text-[var(--muted)] hover:text-white'
            }`}
          >
            {d === 'outbound' ? <Send className="w-3.5 h-3.5" /> : d === 'inbound' ? <Inbox className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
            {d === 'all' ? 'All' : d === 'outbound' ? 'Sent' : 'Received'}
          </button>
        ))}
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-[var(--secondary)] text-[var(--muted)] border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        >
          {agents.map(a => <option key={a} value={a}>{a === 'all' ? 'All Agents' : a}</option>)}
        </select>
      </div>

      {/* Email List */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            AI Email Log — Live
          </h3>
          <span className="text-xs text-[var(--muted)]">{filtered.length} emails</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No emails yet</p>
            <p className="text-xs mt-1 px-4">AI agents will log all sent/received emails here automatically</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/50 max-h-[600px] overflow-y-auto">
            {filtered.map(email => (
              <div key={email.id}>
                <div
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--secondary)]/50 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                >
                  <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-full ${
                    email.direction === 'outbound' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    {email.direction === 'outbound' ? <Send className="w-3.5 h-3.5" /> : <Inbox className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{email.subject ?? '(no subject)'}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-medium capitalize shrink-0">
                        {email.agent_name}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {email.direction === 'outbound'
                        ? <><span className="text-gray-800 font-medium">{email.from_email ?? 'agent'}</span> → {email.to_email}</>
                        : <>From: <span className="text-gray-800 font-medium">{email.from_email}</span></>
                      }
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {new Date(email.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                  <Eye className={`w-3.5 h-3.5 flex-shrink-0 mt-1 text-[var(--muted)] transition-opacity ${expanded === email.id ? 'opacity-100' : 'opacity-30'}`} />
                </div>
                <AnimatePresence>
                  {expanded === email.id && email.body && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pt-0 ml-10">
                        <pre className="text-xs bg-[var(--secondary)] rounded-lg p-3 overflow-x-auto text-green-200 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                          {email.body}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
