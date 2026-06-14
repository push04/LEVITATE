'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Eye, EyeOff, Filter, Key, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react'

type ApiKey = {
  id: string
  prefix: string
  name: string
  createdAt: string
  lastUsedAt: string | null
  requestsThisMonth: number
  rateLimit: number
  isActive: boolean
}

type NewKeyResult = {
  id: string
  key: string
  prefix: string
  name: string
  createdAt: string
}

type Preferences = {
  cities: string[]
  categories: string[]
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative rounded-lg bg-gray-950 text-gray-100 text-[12px] font-mono">
      <button
        onClick={copy}
        className="absolute right-3 top-3 flex items-center gap-1 rounded px-2 py-1 text-[11px] text-gray-400 transition hover:bg-gray-800 hover:text-gray-100"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="overflow-x-auto p-4 leading-relaxed">{code}</pre>
    </div>
  )
}

function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-[#B08D57]'
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-[11px] text-gray-400">
        <span>{used.toLocaleString()} requests</span>
        <span>{limit.toLocaleString()} / mo limit</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  }

  const selectAll = () => onChange([...options])
  const clearAll = () => onChange([])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 transition hover:border-[#B08D57] hover:ring-2 hover:ring-[#B08D57]/10"
      >
        <span className="truncate text-left">
          {selected.length === 0
            ? <span className="text-gray-400">Select {label.toLowerCase()}…</span>
            : selected.length === options.length
            ? `All ${label} (${options.length})`
            : `${selected.length} ${label} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[11px] text-[#B08D57] transition hover:underline">All</button>
              <span className="text-gray-300">·</span>
              <button onClick={clearAll} className="text-[11px] text-gray-400 transition hover:underline">Clear</button>
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto p-1">
            {options.map(opt => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => toggle(opt)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition hover:bg-gray-50"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.includes(opt) ? 'border-[#B08D57] bg-[#B08D57]' : 'border-gray-300'}`}>
                    {selected.includes(opt) && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Lead Filter Preferences section ─────────────────────────────────────────
function LeadPreferences({ apiKey }: { apiKey: string | null }) {
  const [prefs, setPrefs] = useState<Preferences>({ cities: [], categories: [] })
  const [available, setAvailable] = useState<{ cities: string[]; categories: string[] }>({ cities: [], categories: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/business/lead-preferences')
      .then(r => r.json())
      .then((json: { success: boolean; data?: { preferences: Preferences; available: { cities: string[]; categories: string[] } }; error?: string }) => {
        if (json.success && json.data) {
          setPrefs(json.data.preferences)
          setAvailable(json.data.available)
        }
      })
      .catch(() => setError('Failed to load preferences'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/business/lead-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const json: { success: boolean; error?: string } = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const keyPlaceholder = apiKey ?? 'lv_live_<your_key>'
  const cityParam = prefs.cities.length > 0 ? `&cities=${prefs.cities.slice(0, 3).join(',')}${prefs.cities.length > 3 ? ',…' : ''}` : ''
  const catParam = prefs.categories.length > 0 ? `&categories=${prefs.categories.slice(0, 2).join(',')}${prefs.categories.length > 2 ? ',…' : ''}` : ''
  const globalCurl = `curl "https://levitatelabs.online/api/v1/leads?mode=global${cityParam}${catParam}&limit=50" \\\n  -H "Authorization: Bearer ${keyPlaceholder}"`

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#B08D57]" />
          <p className="text-[13px] font-semibold text-gray-800">Lead Filter Preferences</p>
        </div>
        <p className="mt-0.5 text-[12px] text-gray-400">
          Select cities and categories to receive targeted global leads via your API key.
          Saved preferences auto-apply when you call <span className="font-mono">?mode=global</span> without filters.
        </p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Cities</label>
                <MultiSelect
                  label="Cities"
                  options={available.cities}
                  selected={prefs.cities}
                  onChange={cities => setPrefs(p => ({ ...p, cities }))}
                />
                {prefs.cities.length > 0 && (
                  <p className="mt-1 text-[11px] text-gray-400">{prefs.cities.length} of {available.cities.length} selected</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Categories</label>
                <MultiSelect
                  label="Categories"
                  options={available.categories}
                  selected={prefs.categories}
                  onChange={categories => setPrefs(p => ({ ...p, categories }))}
                />
                {prefs.categories.length > 0 && (
                  <p className="mt-1 text-[11px] text-gray-400">{prefs.categories.length} of {available.categories.length} selected</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#9a7a4a] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save Preferences'}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-[12px] text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Global leads with your filters (cURL)</p>
              <CodeBlock code={globalCurl} />
              <p className="mt-2 text-[11px] text-gray-400">
                With saved preferences, <span className="font-mono">?mode=global</span> alone auto-applies your city + category filters.
                Pass explicit <span className="font-mono">cities=</span> or <span className="font-mono">categories=</span> to override per-request.
              </p>
            </div>

            <div className="rounded-lg border border-[#e8d9bc] bg-[#fdf8f1] px-4 py-3 text-[12px] text-gray-600 space-y-1">
              <p className="font-semibold text-[#9a7a4a]">How it works</p>
              <ul className="space-y-0.5 list-disc list-inside text-[11px] text-gray-500">
                <li>Admin generates leads for any city + category via the admin panel</li>
                <li>All generated leads land in the global leads pool</li>
                <li>Your API key returns only leads matching your saved city + category filters</li>
                <li>Use <span className="font-mono">?since=2026-01-01</span> to get only new leads since a date</li>
                <li>Use <span className="font-mono">?min_score=60</span> to filter by AI lead quality score</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/business/api-keys')
      const json: unknown = await res.json()
      if (!res.ok || typeof json !== 'object' || json === null || !('success' in json)) {
        throw new Error('Failed to load keys')
      }
      const payload = json as { success: boolean; data?: { keys: ApiKey[] }; error?: string }
      if (!payload.success) throw new Error(payload.error ?? 'Failed to load keys')
      setKeys(payload.data?.keys ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  useEffect(() => {
    if (showForm) setTimeout(() => inputRef.current?.focus(), 50)
  }, [showForm])

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/business/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || 'Default Key' }),
      })
      const json: unknown = await res.json()
      if (!res.ok || typeof json !== 'object' || json === null) throw new Error('Failed to create key')
      const payload = json as { success: boolean; data?: NewKeyResult; error?: string }
      if (!payload.success) throw new Error(payload.error ?? 'Failed to create key')
      setNewKey(payload.data ?? null)
      setRevealed(false)
      setCopied(false)
      setShowForm(false)
      setNewKeyName('')
      await fetchKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  const copyKey = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey.key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const selectedKey = newKey ? keys.find(k => k.id === newKey.id) : null
  const keyForSnippets = newKey?.key ?? (keys[0] ? `${keys[0].prefix}<your_key>` : 'lv_live_<your_key>')

  const curlSnippet = `curl "https://levitatelabs.online/api/v1/leads?limit=50" \\\n  -H "Authorization: Bearer ${keyForSnippets}"`
  const jsSnippet = `const res = await fetch('https://levitatelabs.online/api/v1/leads?limit=50', {\n  headers: { Authorization: 'Bearer ${keyForSnippets}' },\n})\nconst { data } = await res.json()\nconsole.log(data.leads)`

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">API Keys</h1>
            <p className="mt-0.5 text-[13px] text-gray-500">Authenticate programmatic access to your leads data.</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#9a7a4a] active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            New Key
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {showForm && (
          <div className="rounded-xl border border-[#e8d9bc] bg-[#fdf8f1] p-5">
            <p className="mb-3 text-[13px] font-semibold text-gray-800">Create a new API key</p>
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Key name (e.g. Production)"
                maxLength={60}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#B08D57] focus:ring-2 focus:ring-[#B08D57]/20"
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#9a7a4a] disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewKeyName('') }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-500 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {newKey && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <p className="text-[13px] font-semibold text-emerald-800">
                Key created — copy it now. You won&apos;t be able to see it again.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
              <Key className="h-4 w-4 shrink-0 text-[#B08D57]" />
              <span className="flex-1 font-mono text-[13px] text-gray-800 break-all">
                {revealed ? newKey.key : newKey.key.slice(0, 16) + '••••••••••••••••••••••••••••••'}
              </span>
              <button
                onClick={() => setRevealed(v => !v)}
                className="rounded p-1 text-gray-400 transition hover:text-gray-700"
                title={revealed ? 'Hide key' : 'Reveal key'}
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={copyKey}
                className="flex items-center gap-1.5 rounded-lg bg-[#B08D57] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#9a7a4a]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {selectedKey && (
              <div className="mt-3">
                <UsageMeter used={selectedKey.requestsThisMonth} limit={selectedKey.rateLimit} />
              </div>
            )}
            <button
              onClick={() => setNewKey(null)}
              className="mt-3 text-[11px] text-gray-400 transition hover:text-gray-600"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[13px] font-semibold text-gray-800">Your API Keys</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center">
              <Key className="mx-auto mb-3 h-8 w-8 text-gray-200" />
              <p className="text-[13px] text-gray-400">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {keys.map(k => (
                <li key={k.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">{k.name}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">{k.prefix}</span>
                        {!k.isActive && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">Inactive</span>
                        )}
                      </div>
                      <UsageMeter used={k.requestsThisMonth} limit={k.rateLimit} />
                      <div className="flex flex-wrap gap-4 text-[11px] text-gray-400">
                        <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                        {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-gray-300">
                      <span title="Contact support to revoke keys"><Trash2 className="h-3.5 w-3.5 cursor-not-allowed" /></span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lead filter preferences */}
        <LeadPreferences apiKey={newKey?.key ?? null} />

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[13px] font-semibold text-gray-800">Integration examples</p>
            <p className="mt-0.5 text-[12px] text-gray-400">Use your API key in the Authorization header.</p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">cURL — CRM leads</p>
              <CodeBlock code={curlSnippet} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">JavaScript / Node.js — CRM leads</p>
              <CodeBlock code={jsSnippet} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Global leads (use your preferences above)</p>
              <CodeBlock code={`curl "https://levitatelabs.online/api/v1/leads?mode=global&limit=50" \\\n  -H "Authorization: Bearer ${keyForSnippets}"\n\n# With explicit filters (overrides saved preferences):\ncurl "https://levitatelabs.online/api/v1/leads?mode=global&cities=Mumbai,Delhi&categories=Restaurant&min_score=60" \\\n  -H "Authorization: Bearer ${keyForSnippets}"`} />
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-[12px] text-gray-500">
              <span className="font-semibold text-gray-700">Base URL:</span>{' '}
              <span className="font-mono">https://levitatelabs.online/api/v1</span>
              {'  '}
              <span className="font-semibold text-gray-700">Rate limit:</span>{' '}
              1,000 requests / month
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
