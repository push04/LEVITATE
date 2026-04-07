'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Activity, Clock, TrendingUp, AlertTriangle,
  Zap, Cpu, RefreshCw, Settings, BarChart3,
  Play, Pause, RotateCcw, ChevronDown, CheckCircle, XCircle
} from 'lucide-react'

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

interface GemmaStatus {
  online: boolean
  url: string
  last_alive?: string | null
  model: string
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  reporter:          'Status emails to founder every 30 minutes',
  bizdev:            'Scans Google Maps and JustDial for leads every 2 hours',
  outreach:          'Sends cold emails to hot leads every 5 minutes',
  followup:          'Day 3 and Day 7 follow-up emails every 5 minutes',
  discovery:         'Qualifies leads via email replies',
  proposal:          'Generates proposals and Razorpay payment links',
  onboarding:        'Onboards new paying clients automatically',
  architect:         'Designs website architecture before coding',
  coder:             'Builds websites via GitHub Actions pipeline',
  reviewer:          'Reviews code quality before deployment',
  tester:            'Runs automated tests on staging sites',
  debugger:          'Auto-fixes failing tests',
  deployer:          'Deploys to Netlify on client subdomain',
  invoice:           'Chases overdue payments via email every 30 minutes',
  retention:         'Re-engages past clients every 12 hours',
  agent_evaluator:   'Performance review and credit distribution every 6 hours',
  kaggle_watchdog:   'Monitors Kaggle AI notebook health every 15 minutes',
  supabase_heartbeat:'Keeps Supabase database alive daily'
}

function getTier(balance: number): { label: string; color: string } {
  if (balance >= 1000) return { label: 'LEGENDARY', color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-700' }
  if (balance >= 500)  return { label: 'ELITE',     color: 'bg-purple-500/20 text-purple-300 border border-purple-700' }
  if (balance >= 200)  return { label: 'PERFORMING',color: 'bg-blue-500/20 text-blue-300 border border-blue-700' }
  if (balance >= 50)   return { label: 'NORMAL',    color: 'bg-gray-500/20 text-gray-300 border border-gray-700' }
  return { label: 'PROBATION', color: 'bg-red-500/20 text-red-300 border border-red-700' }
}

function statusDot(agent: AgentData) {
  if (agent.is_suspended) return 'bg-red-500'
  if (agent.failed_last_24h > agent.success_last_24h) return 'bg-yellow-500'
  if (agent.tasks_last_24h > 0) return 'bg-green-500'
  return 'bg-gray-500'
}

export default function AutomationsPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [aiStatus, setAiStatus] = useState<GemmaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agents')
      const { data } = await res.json()
      setAgents(data.agents ?? [])
      setSchedules(data.schedules ?? [])
      setAiStatus(data.gemma_status)
    } catch (err) {
      console.error('Failed to load agent data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const agentAction = async (agentName: string, action: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActionLoading(`${agentName}-${action}`)
    try {
      await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, agentName })
      })
      await loadData()
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
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-[var(--primary)]" />
            Automation Control Center
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            {agents.length} agents running on Groq AI — zero human intervention — zero GPU required
          </p>
        </div>
        <button onClick={loadData} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Total Credits</p>
          <p className="text-2xl font-bold text-yellow-400">{totalCredits.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted)] mt-1">agent economy balance</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Avg Success Rate</p>
          <p className={`text-2xl font-bold ${avgSuccess >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>{avgSuccess}%</p>
          <p className="text-xs text-[var(--muted)] mt-1">all time</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Active (24h)</p>
          <p className="text-2xl font-bold text-blue-400">{active24h}</p>
          <p className="text-xs text-[var(--muted)] mt-1">of {agents.length} agents ran</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--muted)] mb-1">Suspended</p>
          <p className={`text-2xl font-bold ${suspended > 0 ? 'text-red-400' : 'text-green-400'}`}>{suspended}</p>
          <p className="text-xs text-[var(--muted)] mt-1">{suspended === 0 ? 'all systems go' : 'need attention'}</p>
        </div>
      </div>

      {/* AI Status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-semibold text-sm">Groq AI — Primary Intelligence</p>
              <p className="text-xs text-[var(--muted)]">
                llama-3.3-70b-versatile · 14,400 req/day free · No GPU · No limits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-300 border border-green-800">
              ACTIVE
            </span>
            {aiStatus?.online && (
              <span className="text-xs text-[var(--muted)]">+ Kaggle GPU fallback</span>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-[var(--muted)]">
          <div className="bg-[var(--secondary)] rounded-lg p-2 text-center">
            <p className="font-medium text-white">Groq</p>
            <p>14,400 req/day</p>
          </div>
          <div className="bg-[var(--secondary)] rounded-lg p-2 text-center">
            <p className="font-medium text-white">HuggingFace</p>
            <p>1,000 req/day fallback</p>
          </div>
          <div className="bg-[var(--secondary)] rounded-lg p-2 text-center">
            <p className="font-medium text-white">Kaggle GPU</p>
            <p>{aiStatus?.online ? 'Online' : 'Offline (optional)'}</p>
          </div>
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
            const tier = getTier(agent.current_balance)
            const sched = schedules.find(s => s.agent === agent.agent_name)
            const isExpanded = expandedAgent === agent.agent_name

            return (
              <div
                key={agent.agent_name}
                className="glass-card p-4 cursor-pointer hover:border-[var(--primary)]/40 transition-colors"
                onClick={() => setExpandedAgent(isExpanded ? null : agent.agent_name)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusDot(agent)} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className="font-medium text-sm">
                        {agent.label ?? agent.agent_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${agent.current_balance >= 100 ? 'text-green-400' : agent.current_balance >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {agent.current_balance} cr
                    </p>
                    <ChevronDown className={`w-3 h-3 text-[var(--muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                  {AGENT_DESCRIPTIONS[agent.agent_name] ?? 'Automated agent'}
                </p>

                <div className="flex items-center justify-between mt-3 text-xs text-[var(--muted)]">
                  <span>Success: <span className="text-white font-medium">{Math.round(agent.success_rate)}%</span></span>
                  <span>24h tasks: <span className="text-white font-medium">{agent.tasks_last_24h}</span></span>
                  {sched && <span className="text-right">{sched.next_run}</span>}
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
                            {sched.schedule}
                          </p>
                        )}
                        {agent.last_log && (
                          <p className="text-xs text-[var(--muted)]">
                            Last: {agent.last_log.action} — {agent.last_log.status}
                          </p>
                        )}
                        {agent.is_suspended && (
                          <p className="text-xs text-red-400">Suspended: {agent.suspension_reason}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {agent.is_suspended ? (
                            <button
                              onClick={(e) => agentAction(agent.agent_name, 'unsuspend', e)}
                              disabled={!!actionLoading}
                              className="flex-1 text-xs py-1.5 rounded bg-green-800 hover:bg-green-700 text-white font-medium transition-colors"
                            >
                              {actionLoading === `${agent.agent_name}-unsuspend` ? 'Working...' : 'Unsuspend'}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => agentAction(agent.agent_name, 'suspend', e)}
                              disabled={!!actionLoading}
                              className="flex-1 text-xs py-1.5 rounded bg-red-900 hover:bg-red-800 text-white font-medium transition-colors"
                            >
                              {actionLoading === `${agent.agent_name}-suspend` ? 'Working...' : 'Suspend'}
                            </button>
                          )}
                          <button
                            onClick={(e) => agentAction(agent.agent_name, 'reset_credits', e)}
                            disabled={!!actionLoading}
                            className="flex-1 text-xs py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
                          >
                            {actionLoading === `${agent.agent_name}-reset_credits` ? 'Working...' : 'Reset Credits'}
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
        <div className="space-y-0 divide-y divide-[var(--border)]">
          {schedules.map((s) => (
            <div key={s.agent} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">
                  {s.agent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
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

    </div>
  )
}
