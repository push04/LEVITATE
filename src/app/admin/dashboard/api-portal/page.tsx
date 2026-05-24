'use client'

import { useState, useEffect } from 'react'
import { Copy, Eye, EyeOff, Key, Plus, Trash2, RefreshCw, CheckCircle, ToggleLeft, ToggleRight, Code, Zap, Globe, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ApiKey {
  id: string
  name: string
  plan: string
  requests_used: number
  requests_limit: number
  is_active: boolean
  created_at: string
  last_used_at: string | null
  key_prefix: string
}

const PLANS = [
  { id: 'free', label: 'Free', limit: '100 req/month', price: '₹0', color: 'bg-gray-100 text-gray-700 border-gray-200', features: ['Basic leads read', 'No outreach', 'No research'] },
  { id: 'starter', label: 'Starter', limit: '5,000 req/month', price: '₹2,499/mo', color: 'bg-blue-50 text-blue-700 border-blue-200', features: ['Leads read + write', 'Outreach emails', 'Webhook support'] },
  { id: 'pro', label: 'Pro', limit: '50,000 req/month', price: '₹7,999/mo', color: 'bg-violet-50 text-violet-700 border-violet-200', features: ['All Starter features', 'Market research API', 'Priority support', 'Custom rate limits'] },
  { id: 'enterprise', label: 'Enterprise', limit: '1M req/month', price: 'Custom', color: 'bg-amber-50 text-amber-700 border-amber-200', features: ['All Pro features', 'SLA guarantee', 'Dedicated IP', 'On-prem option'] },
]

const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/leads', plan: 'starter', desc: 'List leads with scores, contact info, and status' },
  { method: 'GET', path: '/api/v1/research', plan: 'pro', desc: 'Fetch completed research reports' },
  { method: 'POST', path: '/api/v1/research', plan: 'pro', desc: 'Trigger a new market research run' },
  { method: 'POST', path: '/api/v1/outreach', plan: 'starter', desc: 'Queue an outreach email via AI agent' },
  { method: 'GET', path: '/api/v1/webhooks', plan: 'starter', desc: 'List registered webhook endpoints' },
  { method: 'POST', path: '/api/v1/webhooks', plan: 'starter', desc: 'Register a webhook for events' },
  { method: 'DELETE', path: '/api/v1/webhooks', plan: 'starter', desc: 'Remove a webhook endpoint' },
]

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
}

export default function ApiPortalPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', plan: 'starter' })
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/api-keys')
      const json = await res.json()
      if (json.success) setKeys(json.keys)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createKey = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setNewKey(json.key)
        setShowForm(false)
        setForm({ name: '', plan: 'starter' })
        load()
      }
    } finally { setCreating(false) }
  }

  const toggleKey = async (id: string, active: boolean) => {
    await fetch('/api/admin/api-keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !active }),
    })
    load()
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return
    await fetch(`/api/admin/api-keys?id=${id}`, { method: 'DELETE' })
    load()
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const planColor = (plan: string) => PLANS.find(p => p.id === plan)?.color ?? 'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-[#B08D57]" />
            API Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage API keys for third-party integrations. Base URL:{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700 font-mono">https://levitatelabs.online/api/v1</code>
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 rounded-[10px] bg-[#B08D57] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9a7a4a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Key
        </button>
      </div>

      {/* New key revealed */}
      <AnimatePresence>
        {newKey && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <p className="font-semibold text-emerald-800">API Key Created — Copy it now!</p>
            </div>
            <p className="text-xs text-emerald-700 mb-3">This is the only time the full key is displayed. Store it securely.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm bg-white border border-emerald-200 rounded-lg px-4 py-2.5 text-gray-800 select-all">
                {newKey}
              </code>
              <button
                onClick={() => copy(newKey)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm text-white font-medium hover:bg-emerald-700"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => setNewKey(null)} className="text-emerald-600 text-sm hover:text-emerald-800 px-2">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Create new API key</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Key Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Production App, Dev Test"
                    className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Plan</label>
                  <select
                    value={form.plan}
                    onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                    className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#B08D57]"
                  >
                    {PLANS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.limit}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={createKey}
                  disabled={creating || !form.name.trim()}
                  className="rounded-[10px] bg-[#B08D57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9a7a4a] disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
                <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Active Keys ({keys.length})</h2>
          <button onClick={load} className="text-gray-400 hover:text-gray-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="w-6 h-6 border-2 border-[#B08D57] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No API keys yet</p>
            <p className="text-sm mt-1">Create your first key to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map(k => (
              <div key={k.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{k.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${planColor(k.plan)}`}>{k.plan}</span>
                    {!k.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-400 border-gray-200 font-semibold uppercase">disabled</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <code className="text-xs text-gray-400 font-mono">{k.key_prefix}</code>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B08D57] rounded-full"
                          style={{ width: `${Math.min((k.requests_used / k.requests_limit) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 tabular-nums">
                        {k.requests_used.toLocaleString()} / {k.requests_limit.toLocaleString()}
                      </span>
                    </div>
                    {k.last_used_at && (
                      <span className="text-[10px] text-gray-400">
                        Last used {new Date(k.last_used_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleKey(k.id, k.is_active)}
                    className={`transition-colors ${k.is_active ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-300 hover:text-gray-500'}`}
                    title={k.is_active ? 'Disable key' : 'Enable key'}
                  >
                    {k.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    title="Delete key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div key={plan.id} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase ${plan.color}`}>{plan.label}</span>
                <span className="text-sm font-bold text-gray-900">{plan.price}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">{plan.limit}</p>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoints reference */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-[#B08D57]" />
          Endpoint Reference
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-100">
            {ENDPOINTS.map((ep, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <span className={`text-[10px] font-bold px-2 py-1 rounded border tabular-nums w-16 text-center ${METHOD_COLOR[ep.method]}`}>{ep.method}</span>
                <code className="text-sm font-mono text-gray-700 flex-1 truncate">{ep.path}</code>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase hidden sm:block ${planColor(ep.plan)}`}>{ep.plan}+</span>
                <span className="text-xs text-gray-500 hidden md:block max-w-[240px] truncate">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Full documentation available at{' '}
          <a href="/developers" target="_blank" className="text-[#B08D57] hover:underline">/developers</a>
        </p>
      </div>

      {/* Quick code example */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#B08D57]" />
          Quick Start
        </h2>
        <div className="rounded-xl bg-gray-900 p-5 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono leading-relaxed">{`// JavaScript / Node.js
const res = await fetch('https://levitatelabs.online/api/v1/leads?limit=10', {
  headers: {
    'Authorization': 'Bearer lv_your_api_key_here'
  }
})
const { data } = await res.json()
console.log(data.leads) // Array of enriched leads with scores

// Response shape
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "uuid",
        "business_name": "Sharma Electronics",
        "owner_name": "Rajesh Sharma",
        "city": "Mumbai",
        "phone": "+91 98765 43210",
        "email": "rajesh@sharma.com",
        "ai_score": 8.4,
        "status": "New"
      }
    ],
    "total": 142,
    "limit": 10,
    "offset": 0
  }
}`}</pre>
        </div>
      </div>
    </div>
  )
}
