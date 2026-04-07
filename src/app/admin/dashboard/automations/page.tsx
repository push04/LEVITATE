'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Play, Pause, RotateCcw, Activity, Clock, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, Zap, Cpu, Globe,
  ChevronRight, RefreshCw, Settings, BarChart3, IndianRupee
} from 'lucide-react'

interface AgentData {
  agent_name: string
  current_balance: number
  total_credits_earned: number
  total_tasks_completed: number
  total_tasks_failed: number
  success_rate: number
  api_budget_multiplier: number
  priority_level: number
  is_active: boolean
  is_suspended: boolean
  suspension_reason?: string
  last_active_at: string
  tasks_last_24h: number
  success_last_24h: number
  failed_last_24h: number
  last_log?: { action: string; status: string; created_at: string }
}

interface Schedule {
  agent: string
  schedule: string
  cron: string
  next_run: string
}

interface GemmaStatus {
  url: string
  last_alive?: string
  model: string
}

const AGENT_ICONS: Record<string, string> = {
  reporter: '📊', bizdev: '🔍', outreach: '📲', followup: '🔄',
  discovery: '🎯', proposal: '📋', contract: '📝', onboarding: '🎉',
  architect: '🏗️', coder: '💻', reviewer: '🔍', tester: '🧪',
  debugger: '🐛', deployer: '🚀', client_update: '📱', invoice: '💰',
  retention: '🔁', agent_evaluator: '⚖️', kaggle_watchdog: '👁️', supabase_heartbeat: '💓'
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  reporter: 'Daily 8 AM digest to Pushpal via WhatsApp',
  bizdev: 'Scans Google Maps & JustDial for leads daily',
  outreach: 'Sends personalized WhatsApp to hot leads',
  followup: 'Day 3 & 7 follow-ups on no-reply leads',
  discovery: 'Qualifies leads via WhatsApp conversation',
  proposal: 'Generates PDF proposals + Razorpay links',
  onboarding: 'Onboards new paying clients',
  architect: 'Designs website architecture before coding',
  coder: 'Builds websites via GitHub Actions pipeline',
  reviewer: 'Reviews code quality before deployment',
  tester: 'Runs Playwright tests on staging sites',
  debugger: 'Auto-fixes failing tests',
  deployer: 'Deploys to Netlify on client subdomain',
  invoice: 'Chases overdue payments automatically',
  retention: 'Re-engages past clients with upsells',
  agent_evaluator: 'Weekly performance review & credit distribution',
  kaggle_watchdog: 'Monitors Gemma 4 GPU notebook health',
  supabase_heartbeat: 'Keeps free Supabase DB from pausing'
}

function getStatusColor(agent: AgentData): string {
  if (agent.is_suspended) return 'text-red-400 bg-red-950 border-red-800'
  if (agent.success_rate < 70) return 'text-yellow-400 bg-yellow-950 border-yellow-800'
  return 'text-green-400 bg-green-950 border-green-800'
}

function getCreditColor(balance: number): string {
  if (balance >= 500) return 'text-yellow-300'
  if (balance >= 200) return 'text-blue-400'
  if (balance >= 100) return 'text-green-400'
  if (balance >= 50) return 'text-gray-300'
  return 'text-red-400'
}

function getTierBadge(balance: number): { label: string; color: string } {
  if (balance >= 1000) return { label: 'LEGENDARY', color: 'bg-yellow-500 text-black' }
  if (balance >= 500) return { label: 'ELITE', color: 'bg-purple-500 text-white' }
  if (balance >= 200) return { label: 'PERFORMING', color: 'bg-blue-500 text-white' }
  if (balance >= 100) return { label: 'NORMAL', color: 'bg-gray-600 text-white' }
  if (balance >= 50) return { label: 'NORMAL', color: 'bg-gray-700 text-white' }
  return { label: 'PROBATION', color: 'bg-red-700 text-white' }
}

export default function AutomationsPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [gemmaStatus, setGemmaStatus] = useState<GemmaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null)
  const [gemmaUrl, setGemmaUrl] = useState('')
  const [showGemmaSetup, setShowGemmaSetup] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agents')
      const { data } = await res.json()
      setAgents(data.agents ?? [])
      setSchedules(data.schedules ?? [])
      setGemmaStatus(data.gemma_status)
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

  const agentAction = async (agentName: string, action: string) => {
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

  const totalCredits = agents.reduce((s, a) => s + a.current_balance, 0)
  const suspended = agents.filter(a => a.is_suspended).length
  const elite = agents.filter(a => a.current_balance >= 500).length
  const avgSuccess = agents.length > 0
    ? Math.round(agents.reduce((s, a) => s + a.success_rate, 0) / agents.length)
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--muted)]">Loading agent network...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bot className="w-7 h-7 text-[var(--primary)]" />
            Automation Control Center
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            {agents.length} agents · Zero human intervention · Gemma 4 on Kaggle GPU
          </p>
        </div>
        <button onClick={loadData} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-[var(--muted)]">Total Credits</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{totalCredits.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted)] mt-1">across all agents</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[var(--muted)]">Avg Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{avgSuccess}%</p>
          <p className="text-xs text-[var(--muted)] mt-1">across all agents</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-[var(--muted)]">Suspended</span>
          </div>
          <p className={`text-2xl font-bold ${suspended > 0 ? 'text-red-400' : 'text-green-400'}`}>{suspended}</p>
          <p className="text-xs text-[var(--muted)] mt-1">agents need attention</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-[var(--muted)]">Elite Agents</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{elite}</p>
          <p className="text-xs text-[var(--muted)] mt-1">500+ credit balance</p>
        </motion.div>
      </div>

      {/* Gemma 4 AI Status */}
      <div className={`glass-card p-4 border ${gemmaStatus?.url.includes('✅') ? 'border-green-800' : 'border-red-800'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-semibold text-sm">Gemma 4 · Kaggle Free GPU</p>
              <p className="text-xs text-[var(--muted)]">Primary AI · ₹0/month · {gemmaStatus?.model}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${gemmaStatus?.url.includes('✅') ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              {gemmaStatus?.url ?? 'Not configured'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {gemmaStatus?.last_alive && (
              <span className="text-xs text-[var(--muted)]">Last alive: {new Date(gemmaStatus.last_alive).toLocaleTimeString('en-IN')}</span>
            )}
            <button onClick={() => setShowGemmaSetup(!showGemmaSetup)} className="btn-ghost text-xs px-3 py-1">
              <Settings className="w-3 h-3 mr-1 inline" />
              Setup Guide
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showGemmaSetup && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 overflow-hidden">
              <div className="terminal text-xs p-4 rounded-lg">
                <p className="text-green-400 mb-2"># Kaggle Gemma 4 Setup (free GPU)</p>
                <p className="text-gray-400">1. Create Kaggle account + enable GPU notebook</p>
                <p className="text-gray-400">2. Run: <span className="text-yellow-300">!pip install ollama fastapi uvicorn pyngrok</span></p>
                <p className="text-gray-400">3. Run: <span className="text-yellow-300">!ollama pull gemma2:2b</span></p>
                <p className="text-gray-400">4. Start FastAPI wrapper (see /scripts/kaggle-server.py)</p>
                <p className="text-gray-400">5. Set GEMMA_API_URL in Netlify env vars</p>
                <p className="text-gray-400">6. Kaggle gives 30h free GPU per week</p>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={gemmaUrl}
                  onChange={e => setGemmaUrl(e.target.value)}
                  placeholder="https://xxxx.ngrok.io"
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm"
                />
                <button
                  onClick={async () => {
                    await fetch('/api/admin/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_gemma_url', url: gemmaUrl }) })
                    alert('Saved! Update GEMMA_API_URL in Netlify env vars too.')
                  }}
                  className="btn-primary text-sm px-4"
                >
                  Save URL
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Agent Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-[var(--primary)]" />
          Agent Network ({agents.length} agents)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const tier = getTierBadge(agent.current_balance)
            const schedule = schedules.find(s => s.agent === agent.agent_name)

            return (
              <motion.div
                key={agent.agent_name}
                whileHover={{ scale: 1.01 }}
                className={`glass-card p-4 border cursor-pointer ${getStatusColor(agent)}`}
                onClick={() => setSelectedAgent(selectedAgent?.agent_name === agent.agent_name ? null : agent)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{AGENT_ICONS[agent.agent_name] ?? '🤖'}</span>
                    <div>
                      <p className="font-semibold text-sm capitalize">{agent.agent_name.replace('_', ' ')}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${tier.color}`}>{tier.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getCreditColor(agent.current_balance)}`}>
                      {agent.current_balance} cr
                    </p>
                    {agent.is_suspended && (
                      <span className="text-xs text-red-400">⛔ Suspended</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[var(--muted)] mb-3 line-clamp-1">
                  {AGENT_DESCRIPTIONS[agent.agent_name] ?? 'Automated agent'}
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Success</p>
                    <p className="text-sm font-semibold text-green-400">{Math.round(agent.success_rate)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">24h tasks</p>
                    <p className="text-sm font-semibold">{agent.tasks_last_24h}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Priority</p>
                    <p className="text-sm font-semibold">{agent.priority_level === 0 ? 'MAX' : agent.priority_level}</p>
                  </div>
                </div>

                {/* Credit bar */}
                <div className="mb-3">
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${Math.min(100, (agent.current_balance / 1000) * 100)}%` }}
                    />
                  </div>
                </div>

                {schedule && (
                  <div className="flex items-center gap-1 text-xs text-[var(--muted)] mb-3">
                    <Clock className="w-3 h-3" />
                    {schedule.schedule} · Next: {schedule.next_run}
                  </div>
                )}

                {/* Actions (expanded) */}
                <AnimatePresence>
                  {selectedAgent?.agent_name === agent.agent_name && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 mt-2 pt-2 border-t border-[var(--border)]">
                      {agent.is_suspended ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); agentAction(agent.agent_name, 'unsuspend') }}
                          disabled={!!actionLoading}
                          className="flex-1 text-xs py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-medium"
                        >
                          {actionLoading === `${agent.agent_name}-unsuspend` ? '...' : '✅ Unsuspend'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); agentAction(agent.agent_name, 'suspend') }}
                          disabled={!!actionLoading}
                          className="flex-1 text-xs py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-medium"
                        >
                          {actionLoading === `${agent.agent_name}-suspend` ? '...' : '⛔ Suspend'}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); agentAction(agent.agent_name, 'reset_credits') }}
                        disabled={!!actionLoading}
                        className="flex-1 text-xs py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"
                      >
                        {actionLoading === `${agent.agent_name}-reset_credits` ? '...' : '🔄 Reset (100 cr)'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Scheduled Functions Timeline */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--primary)]" />
          Daily Schedule (IST)
        </h2>
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.agent} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{AGENT_ICONS[s.agent] ?? '🤖'}</span>
                <div>
                  <p className="text-sm font-medium capitalize">{s.agent.replace('_', ' ')}</p>
                  <p className="text-xs text-[var(--muted)]">{AGENT_DESCRIPTIONS[s.agent]}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{s.schedule}</p>
                <p className="text-xs text-[var(--muted)]">{s.next_run}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
