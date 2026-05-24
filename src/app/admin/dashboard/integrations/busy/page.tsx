'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Check, X, AlertCircle, Upload, Link, Webhook,
  Download, Play, Settings, ChevronRight, Eye, EyeOff,
  FileSpreadsheet, Users, FileText, Package, BookOpen,
  Copy, ExternalLink, Zap, Clock, Activity, Info,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface BusyConfig {
  integration_type: 'manual' | 'busynotify' | 'webhook'
  busynotify_token: string
  busynotify_base_url: string
  sync_enabled: boolean
  sync_frequency_minutes: number
  sync_customers: boolean
  sync_invoices: boolean
  sync_products: boolean
  sync_ledger: boolean
  webhook_secret: string
  last_synced_at: string | null
}

interface SyncResult {
  entity: string
  total: number
  imported: number
  skipped: number
  failed: number
  error?: string
}

interface SyncLog {
  id: string
  sync_type: string
  entity_type: string | null
  status: 'success' | 'partial' | 'failed'
  records_total: number
  records_imported: number
  records_skipped: number
  records_failed: number
  created_at: string
  metadata?: { results?: SyncResult[] }
}

interface CsvRow { [key: string]: string }

// ── CSV Parser ─────────────────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }

  function splitCsvLine(line: string): string[] {
    const result: string[] = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        result.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = splitCsvLine(lines[0])
  const rows = lines.slice(1).map(l => {
    const vals = splitCsvLine(l)
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}

// ── CRM field options ──────────────────────────────────────────────────────
const CRM_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'business_name', label: 'Business Name' },
  { value: 'name', label: 'Contact Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'city', label: 'City' },
  { value: 'service_category', label: 'Service Category' },
  { value: 'budget', label: 'Budget / Balance' },
  { value: 'notes', label: 'Notes' },
  { value: 'website_link', label: 'Website' },
  { value: 'status', label: 'Status' },
]

const BUSY_AUTO_MAP: Record<string, string> = {
  'account name': 'business_name', 'party name': 'business_name', 'name': 'business_name',
  'contact name': 'name',
  'mobile': 'phone', 'mobile no': 'phone', 'mobile no.': 'phone', 'phone': 'phone',
  'email': 'email', 'email id': 'email',
  'city': 'city',
  'account group': 'service_category', 'group': 'service_category',
  'opening balance': 'budget', 'balance': 'budget', 'credit limit': 'budget',
  'address': 'notes',
}

function autoMap(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const h of headers) {
    const mapped = BUSY_AUTO_MAP[h.toLowerCase().trim()]
    if (mapped) result[h] = mapped
  }
  return result
}

// ── Helpers ────────────────────────────────────────────────────────────────
const F = (n: string) => ({ fontFamily: 'Inter, sans-serif', fontSize: n })
const card = { background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }
const tab = (active: boolean) => ({
  padding: '10px 0', marginRight: 28, ...F('13px'), fontWeight: 600,
  background: 'none', border: 'none', cursor: 'pointer',
  borderBottom: active ? '2px solid #B08D57' : '2px solid transparent',
  color: active ? '#B08D57' : '#6B7280', transition: 'all 0.15s',
})
const pill = (color: 'green' | 'red' | 'orange') => {
  const map = { green: ['#D1FAE5', '#059669'], red: ['#FEE2E2', '#DC2626'], orange: ['#FEF3C7', '#D97706'] }
  return { background: map[color][0], color: map[color][1], borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif' }
}
function fmtDate(d: string) { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }

// ── Page ───────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'busynotify' | 'upload' | 'webhook' | 'logs'

export default function BusyIntegrationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [config, setConfig] = useState<BusyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [tokenVisible, setTokenVisible] = useState(false)
  const [toast, setToast] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testError, setTestError] = useState('')

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({})
  const [csvSourceType, setCsvSourceType] = useState<'party' | 'invoice'>('party')
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/integrations/busy/config')
    const json = await res.json()
    if (json.config) setConfig(json.config)
    setLoading(false)
  }, [])

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    const res = await fetch('/api/admin/integrations/busy/logs').catch(() => null)
    const json = res ? await res.json().catch(() => ({})) : {}
    setLogs((json.logs ?? []) as SyncLog[])
    setLogsLoading(false)
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])
  useEffect(() => { if (activeTab === 'logs') loadLogs() }, [activeTab, loadLogs])

  const saveConfig = async (patch: Partial<BusyConfig>) => {
    if (!config) return
    setSaving(true)
    const updated = { ...config, ...patch }
    setConfig(updated)
    await fetch('/api/admin/integrations/busy/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    showToast('Configuration saved')
  }

  const testConnection = async () => {
    if (!config?.busynotify_token) return
    setTestStatus('testing'); setTestError('')
    try {
      const res = await fetch(`${config.busynotify_base_url.replace(/\/$/, '')}/api/v1/customers`, {
        headers: { Authorization: `Bearer ${config.busynotify_token}` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) { setTestStatus('ok'); showToast('Connection successful!') }
      else { setTestStatus('fail'); setTestError(`HTTP ${res.status}`) }
    } catch (e) {
      setTestStatus('fail')
      setTestError(e instanceof Error ? e.message : 'Connection failed')
    }
  }

  const runSync = async (entity?: string) => {
    setSyncing(true); setSyncResults(null)
    const res = await fetch('/api/admin/integrations/busy/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entity ? { entity } : {}),
    })
    const json = await res.json()
    setSyncing(false)
    if (json.error) { showToast('Sync failed: ' + json.error); return }
    setSyncResults(json.results ?? [])
    showToast('Sync completed')
    loadConfig()
  }

  // CSV handlers
  const handleCsvFile = (file: File) => {
    setCsvFile(file); setCsvResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers, rows } = parseCsv(text)
      setCsvHeaders(headers)
      setCsvRows(rows)
      setCsvMapping(autoMap(headers))
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleCsvFile(file)
  }

  const uploadCsv = async () => {
    if (!csvRows.length) return
    setCsvUploading(true); setCsvResult(null)

    // Apply mapping: transform rows to mapped rows
    const mappedRows = csvRows.map(row => {
      const out: Record<string, string> = {}
      for (const [csvCol, crmField] of Object.entries(csvMapping)) {
        if (crmField && row[csvCol]) out[crmField] = row[csvCol]
      }
      return out
    })

    const res = await fetch('/api/admin/integrations/busy/upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: mappedRows, source_type: csvSourceType }),
    })
    const json = await res.json()
    setCsvUploading(false)
    if (json.error) { showToast('Upload failed: ' + json.error); return }
    setCsvResult({ imported: json.imported, skipped: json.skipped ?? 0, failed: json.failed ?? 0 })
    showToast(`Imported ${json.imported} records`)
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/busy?secret=${config?.webhook_secret ?? ''}`
    : '/api/webhook/busy?secret=...'

  if (loading || !config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>
        <RefreshCw size={20} style={{ animation: 'spin 0.8s linear infinite', marginRight: 10 }} />
        Loading...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 0', paddingBottom: 80, minHeight: '100vh', background: '#F8F9FB', fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#1A1916', color: '#F4F2EE', padding: '12px 20px', borderRadius: 10, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
          >
            <Check size={14} color="#B08D57" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>B</span>
              </div>
              <div>
                <h1 style={{ ...F('22px'), fontWeight: 700, color: '#111827', margin: 0 }}>Busy Software Integration</h1>
                <p style={{ ...F('13px'), color: '#6B7280', margin: 0, marginTop: 2 }}>Sync customers, invoices & products from BUSY Accounting</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {config.last_synced_at && (
              <span style={{ ...F('12px'), color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} />Last synced {fmtDate(config.last_synced_at)}
              </span>
            )}
            {config.integration_type === 'busynotify' && (
              <button
                onClick={() => runSync()}
                disabled={syncing || !config.busynotify_token}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#B08D57', color: 'white', ...F('13px'), fontWeight: 600, cursor: 'pointer', opacity: (syncing || !config.busynotify_token) ? 0.5 : 1 }}
              >
                {syncing ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Play size={14} />}
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>

        {/* Status cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { icon: Activity, label: 'Integration Mode', value: config.integration_type === 'busynotify' ? 'BusyNotify API' : config.integration_type === 'webhook' ? 'Live Webhook' : 'Manual Upload', color: '#3B82F6' },
            { icon: Users, label: 'Sync Customers', value: config.sync_customers ? 'Enabled' : 'Disabled', color: config.sync_customers ? '#059669' : '#9CA3AF' },
            { icon: FileText, label: 'Sync Invoices', value: config.sync_invoices ? 'Enabled' : 'Disabled', color: config.sync_invoices ? '#059669' : '#9CA3AF' },
            { icon: Package, label: 'Sync Products', value: config.sync_products ? 'Enabled' : 'Disabled', color: config.sync_products ? '#059669' : '#9CA3AF' },
          ].map(m => (
            <div key={m.label} style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <m.icon size={15} color={m.color} />
                <span style={{ ...F('11px'), color: '#6B7280', fontWeight: 500 }}>{m.label}</span>
              </div>
              <p style={{ ...F('15px'), fontWeight: 700, color: m.color, margin: 0 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: 28 }}>
          {([
            ['overview', 'Overview', Settings],
            ['busynotify', 'BusyNotify API', Link],
            ['upload', 'CSV Upload', Upload],
            ['webhook', 'Live Webhook', Webhook],
            ['logs', 'Sync Logs', Activity],
          ] as [TabId, string, React.ComponentType<{size?: number; color?: string}>][]).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={tab(activeTab === id)}>
              <span style={{ marginRight: 5, display: 'inline-flex', verticalAlign: 'middle' }}>
                <Icon size={13} color={activeTab === id ? '#B08D57' : '#9CA3AF'} />
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ───────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Integration type selector */}
            <div style={card}>
              <h3 style={{ ...F('14px'), fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Integration Method</h3>
              <p style={{ ...F('13px'), color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
                Choose how LEVITATE connects to your BUSY installation.
              </p>
              {([
                ['manual', 'Manual CSV Upload', 'Export CSV from BUSY → upload here. Works with all BUSY versions.', Upload],
                ['busynotify', 'BusyNotify API', 'Auto-sync via BusyNotify connector installed on your BUSY server. Requires BusyNotify subscription.', Link],
                ['webhook', 'Live Webhook', 'BUSY fires an HTTP call on every invoice save — capture real-time events.', Webhook],
              ] as [BusyConfig['integration_type'], string, string, React.ComponentType<{size?:number;color?:string}>][]).map(([val, label, desc, Icon]) => (
                <div
                  key={val}
                  onClick={() => saveConfig({ integration_type: val })}
                  style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 10, border: `2px solid ${config.integration_type === val ? '#B08D57' : '#E5E7EB'}`, background: config.integration_type === val ? 'rgba(176,141,87,0.04)' : 'white', cursor: 'pointer', marginBottom: 10, transition: 'all 0.15s' }}
                >
                  <span style={{ marginTop: 2, flexShrink: 0 }}><Icon size={18} color={config.integration_type === val ? '#B08D57' : '#9CA3AF'} /></span>
                  <div>
                    <p style={{ ...F('13px'), fontWeight: 600, color: '#111827', margin: 0 }}>{label}</p>
                    <p style={{ ...F('12px'), color: '#6B7280', margin: '3px 0 0', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                  {config.integration_type === val && <span style={{ marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}><Check size={16} color="#B08D57" /></span>}
                </div>
              ))}
            </div>

            {/* Entity config */}
            <div style={card}>
              <h3 style={{ ...F('14px'), fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>What to Sync</h3>
              <p style={{ ...F('13px'), color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
                Choose which BUSY data entities to pull into LEVITATE.
              </p>
              {([
                ['sync_customers', 'Customers / Parties', 'Syncs as CRM leads. Maps GSTIN, balance, address.', Users, true],
                ['sync_invoices', 'Sales Invoices', 'Stores invoice data with party, items, amounts, tax.', FileText, true],
                ['sync_products', 'Item Master', 'Syncs product catalog with HSN, rate, stock.', Package, false],
                ['sync_ledger', 'Ledger / Accounts', 'Trial balance and transaction summaries.', BookOpen, false],
              ] as [keyof BusyConfig, string, string, React.ComponentType<{size?:number;color?:string}>, boolean][]).map(([key, label, desc, Icon, rec]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <button
                    onClick={() => saveConfig({ [key]: !config[key] })}
                    style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: config[key] ? '#B08D57' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                      {config[key] && <Check size={12} color="white" />}
                    </div>
                  </button>
                  <div>
                    <p style={{ ...F('13px'), fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={13} color="#6B7280" />
                      {label}
                      {rec && <span style={{ ...F('10px'), background: '#D1FAE5', color: '#059669', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>Recommended</span>}
                    </p>
                    <p style={{ ...F('12px'), color: '#6B7280', margin: '3px 0 0' }}>{desc}</p>
                  </div>
                </div>
              ))}

              {saving && <p style={{ ...F('12px'), color: '#B08D57', marginTop: 8 }}>Saving...</p>}
            </div>

            {/* Sync results */}
            {syncResults && (
              <div style={{ ...card, gridColumn: '1 / -1' }}>
                <h3 style={{ ...F('14px'), fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#059669" /> Last Sync Results
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {syncResults.map(r => (
                    <div key={r.entity} style={{ background: r.error ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${r.error ? '#FECACA' : '#BBF7D0'}`, borderRadius: 10, padding: '14px 16px' }}>
                      <p style={{ ...F('12px'), fontWeight: 600, color: '#374151', margin: '0 0 8px', textTransform: 'capitalize' }}>{r.entity}</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ ...F('11px'), color: '#059669' }}>{r.imported} imported</span>
                        {r.skipped > 0 && <span style={{ ...F('11px'), color: '#D97706' }}>{r.skipped} skipped</span>}
                        {r.failed > 0 && <span style={{ ...F('11px'), color: '#DC2626' }}>{r.failed} failed</span>}
                      </div>
                      {r.error && <p style={{ ...F('11px'), color: '#DC2626', margin: '6px 0 0' }}>{r.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BUSYNOTIFY TAB ─────────────────────────────────────────────── */}
        {activeTab === 'busynotify' && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Link size={18} color="#B08D57" />
                <h3 style={{ ...F('15px'), fontWeight: 700, color: '#111827', margin: 0 }}>BusyNotify API Setup</h3>
              </div>

              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10 }}>
                <Info size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ ...F('13px'), fontWeight: 600, color: '#92400E', margin: 0 }}>Requires BusyNotify Subscription</p>
                  <p style={{ ...F('12px'), color: '#92400E', margin: '4px 0 0', lineHeight: 1.5 }}>
                    BusyNotify installs a connector on your BUSY server machine and exposes a REST API.
                    Visit <strong>busynotify.in</strong> to get a subscription and your Bearer token.
                    Supports BUSY v17, v18, v21+.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ ...F('12px'), fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>BusyNotify Base URL</label>
                  <input
                    value={config.busynotify_base_url}
                    onChange={e => setConfig(c => c ? { ...c, busynotify_base_url: e.target.value } : c)}
                    onBlur={() => saveConfig({ busynotify_base_url: config.busynotify_base_url })}
                    placeholder="https://api.busynotify.in"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, ...F('13px'), boxSizing: 'border-box' }}
                  />
                  <p style={{ ...F('11px'), color: '#9CA3AF', marginTop: 4 }}>Default: https://api.busynotify.in — change if self-hosted</p>
                </div>

                <div>
                  <label style={{ ...F('12px'), fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Bearer Token</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type={tokenVisible ? 'text' : 'password'}
                        value={config.busynotify_token}
                        onChange={e => setConfig(c => c ? { ...c, busynotify_token: e.target.value } : c)}
                        onBlur={() => saveConfig({ busynotify_token: config.busynotify_token })}
                        placeholder="Enter your BusyNotify Bearer token"
                        style={{ width: '100%', padding: '9px 40px 9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, ...F('13px'), boxSizing: 'border-box' }}
                      />
                      <button onClick={() => setTokenVisible(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        {tokenVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <button
                      onClick={testConnection}
                      disabled={!config.busynotify_token || testStatus === 'testing'}
                      style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', ...F('13px'), fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: !config.busynotify_token ? 0.5 : 1, color: testStatus === 'ok' ? '#059669' : testStatus === 'fail' ? '#DC2626' : '#374151' }}
                    >
                      {testStatus === 'testing' ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : testStatus === 'ok' ? <Check size={13} /> : testStatus === 'fail' ? <X size={13} /> : <Zap size={13} />}
                      {testStatus === 'testing' ? 'Testing...' : testStatus === 'ok' ? 'Connected' : testStatus === 'fail' ? 'Failed' : 'Test'}
                    </button>
                  </div>
                  {testError && <p style={{ ...F('12px'), color: '#DC2626', marginTop: 6 }}>{testError}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ ...F('12px'), fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Auto-Sync Frequency</label>
                    <select
                      value={config.sync_frequency_minutes}
                      onChange={e => { const v = parseInt(e.target.value); setConfig(c => c ? { ...c, sync_frequency_minutes: v } : c); saveConfig({ sync_frequency_minutes: v }) }}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, ...F('13px'), background: 'white', boxSizing: 'border-box' }}
                    >
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every hour</option>
                      <option value={240}>Every 4 hours</option>
                      <option value={1440}>Once daily</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                      <button
                        onClick={() => saveConfig({ sync_enabled: !config.sync_enabled })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <div style={{ width: 36, height: 20, borderRadius: 10, background: config.sync_enabled ? '#059669' : '#D1D5DB', position: 'relative', transition: 'background 0.2s' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 8, background: 'white', position: 'absolute', top: 2, left: config.sync_enabled ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </button>
                      <span style={{ ...F('13px'), fontWeight: 600, color: '#374151' }}>Auto-Sync {config.sync_enabled ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync by entity */}
            <div style={card}>
              <h3 style={{ ...F('14px'), fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Sync Individual Entities</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  ['customers', 'Sync Customers', Users],
                  ['invoices', 'Sync Invoices', FileText],
                  ['products', 'Sync Products', Package],
                ] as [string, string, React.ComponentType<{size?: number; color?: string}>][]).map(([entity, label, Icon]) => (
                  <button
                    key={entity}
                    onClick={() => runSync(entity)}
                    disabled={syncing || !config.busynotify_token}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: 10, background: 'white', cursor: 'pointer', ...F('13px'), fontWeight: 600, color: '#374151', opacity: (syncing || !config.busynotify_token) ? 0.5 : 1, transition: 'background 0.15s' }}
                  >
                    {syncing ? <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite', color: '#B08D57' }} /> : <Icon size={15} color="#B08D57" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CSV UPLOAD TAB ─────────────────────────────────────────────── */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: 760 }}>
            <div style={{ ...card, marginBottom: 24 }}>
              <h3 style={{ ...F('15px'), fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Upload BUSY Export</h3>
              <p style={{ ...F('13px'), color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
                Export data from BUSY: <strong>Administration → Reports</strong> → select report → <strong>ALT+E → Excel/CSV</strong>.<br />
                For party master: <strong>Display → Account Books → Account List</strong> → Export as CSV.
              </p>

              {/* Source type */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {([['party', 'Party / Customer Master', Users], ['invoice', 'Sales Invoice Register', FileText]] as [string, string, React.ComponentType<{size?:number;color?:string}>][]).map(([val, label, Icon]) => (
                  <button
                    key={val}
                    onClick={() => setCsvSourceType(val as 'party' | 'invoice')}
                    style={{ flex: 1, padding: '12px 16px', border: `2px solid ${csvSourceType === val ? '#B08D57' : '#E5E7EB'}`, borderRadius: 10, background: csvSourceType === val ? 'rgba(176,141,87,0.04)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, ...F('13px'), fontWeight: 600, color: csvSourceType === val ? '#B08D57' : '#374151' }}
                  >
                    <Icon size={15} color={csvSourceType === val ? '#B08D57' : '#9CA3AF'} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById('csv-file-input')?.click()}
                style={{ border: '2px dashed #D1D5DB', borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: csvFile ? '#F0FDF4' : '#F9FAFB', transition: 'all 0.15s', marginBottom: 20 }}
              >
                <FileSpreadsheet size={32} color={csvFile ? '#059669' : '#9CA3AF'} style={{ margin: '0 auto 10px', display: 'block' }} />
                {csvFile ? (
                  <>
                    <p style={{ ...F('14px'), fontWeight: 600, color: '#059669', margin: 0 }}>{csvFile.name}</p>
                    <p style={{ ...F('12px'), color: '#6B7280', margin: '4px 0 0' }}>{csvRows.length} rows detected · Click to change</p>
                  </>
                ) : (
                  <>
                    <p style={{ ...F('14px'), fontWeight: 600, color: '#374151', margin: 0 }}>Drop your CSV file here</p>
                    <p style={{ ...F('12px'), color: '#9CA3AF', margin: '4px 0 0' }}>or click to browse · .csv files only</p>
                  </>
                )}
                <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCsvFile(e.target.files[0])} />
              </div>

              {/* Column mapper */}
              {csvHeaders.length > 0 && (
                <>
                  <div style={{ borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
                    <p style={{ ...F('13px'), fontWeight: 600, color: '#374151', marginBottom: 12 }}>Map CSV Columns to CRM Fields</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr', gap: '8px 12px', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ ...F('11px'), fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>CSV Column</span>
                      <span />
                      <span style={{ ...F('11px'), fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>CRM Field</span>
                      {csvHeaders.map(h => (
                        <>
                          <div key={`h-${h}`} style={{ padding: '7px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 7, ...F('12px'), color: '#374151', fontWeight: 500 }}>{h}</div>
                          <ChevronRight size={14} color="#9CA3AF" key={`arr-${h}`} />
                          <select
                            key={`sel-${h}`}
                            value={csvMapping[h] ?? ''}
                            onChange={e => setCsvMapping(m => ({ ...m, [h]: e.target.value }))}
                            style={{ padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 7, ...F('12px'), background: 'white', color: '#111827' }}
                          >
                            {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <p style={{ ...F('12px'), fontWeight: 600, color: '#374151', marginBottom: 10 }}>Preview (first 3 rows)</p>
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 20 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F9FAFB' }}>
                          {csvHeaders.map(h => <th key={h} style={{ padding: '8px 12px', ...F('11px'), fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(0, 3).map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                            {csvHeaders.map(h => <td key={h} style={{ padding: '8px 12px', ...F('12px'), color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[h]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Result */}
                  {csvResult && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 20 }}>
                      <span style={{ ...F('13px'), color: '#059669', fontWeight: 700 }}>✓ {csvResult.imported} imported</span>
                      {csvResult.skipped > 0 && <span style={{ ...F('13px'), color: '#D97706', fontWeight: 600 }}>{csvResult.skipped} skipped (duplicates)</span>}
                      {csvResult.failed > 0 && <span style={{ ...F('13px'), color: '#DC2626', fontWeight: 600 }}>{csvResult.failed} failed</span>}
                    </div>
                  )}

                  <button
                    onClick={uploadCsv}
                    disabled={csvUploading}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: '#B08D57', color: 'white', ...F('14px'), fontWeight: 600, cursor: 'pointer', opacity: csvUploading ? 0.6 : 1 }}
                  >
                    {csvUploading ? <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={15} />}
                    {csvUploading ? 'Importing...' : `Import ${csvRows.length} Records to CRM`}
                  </button>
                </>
              )}
            </div>

            {/* How to export from Busy guide */}
            <div style={{ ...card, background: '#FFFBF5', border: '1px solid #FDE68A' }}>
              <h3 style={{ ...F('13px'), fontWeight: 700, color: '#92400E', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={14} /> How to Export from BUSY
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Party/Customer List', 'Display → Account Books → Account List → ALT+E → CSV'],
                  ['Sales Invoice Register', 'Display → Voucher Register → Sales Voucher Register → ALT+E → CSV'],
                  ['Item Master', 'Display → Inventory Books → Item List → ALT+E → CSV'],
                  ['Outstanding', 'Display → Outstanding Reports → Party-wise → ALT+E → CSV'],
                ].map(([title, path]) => (
                  <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <ChevronRight size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <span style={{ ...F('13px'), fontWeight: 600, color: '#92400E' }}>{title}: </span>
                      <code style={{ ...F('12px'), color: '#78350F', background: 'rgba(120,53,15,0.08)', padding: '1px 6px', borderRadius: 4 }}>{path}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── WEBHOOK TAB ────────────────────────────────────────────────── */}
        {activeTab === 'webhook' && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Webhook size={18} color="#B08D57" />
                <h3 style={{ ...F('15px'), fontWeight: 700, color: '#111827', margin: 0 }}>Live Webhook from BUSY</h3>
              </div>
              <p style={{ ...F('13px'), color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
                BUSY can fire an HTTP request on every voucher save (invoice, payment, etc.) via its SMS API configuration.
                Paste this URL into BUSY's SMS/WhatsApp API setup to capture real-time events.
              </p>

              {/* Webhook URL */}
              <label style={{ ...F('12px'), fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Your Webhook URL (copy this into BUSY)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  readOnly
                  value={webhookUrl}
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, ...F('12px'), color: '#374151', background: '#F9FAFB', fontFamily: 'monospace' }}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); showToast('URL copied') }}
                  style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: '#111827', color: 'white', ...F('12px'), fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>

              {/* How to configure in BUSY */}
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
                <p style={{ ...F('13px'), fontWeight: 700, color: '#1E40AF', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Info size={14} /> Configure in BUSY</p>
                <ol style={{ ...F('13px'), color: '#1E3A8A', margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                  <li>Open BUSY → <strong>Setup → SMS/WhatsApp Configuration</strong></li>
                  <li>Set <strong>API Type</strong> to "HTTP" or "URL-based"</li>
                  <li>Paste the webhook URL above into the <strong>API URL</strong> field</li>
                  <li>In the URL template, BUSY will append params: <code style={{ background: 'rgba(30,58,138,0.1)', padding: '0 4px', borderRadius: 3 }}>?mobileno=MOBILE&text=MESSAGE</code></li>
                  <li>Save. BUSY will now hit this URL on every voucher save event.</li>
                </ol>
              </div>

              {/* Secret */}
              <div>
                <label style={{ ...F('12px'), fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Webhook Secret (included in URL for validation)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={config.webhook_secret}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, ...F('12px'), color: '#374151', background: '#F9FAFB', fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(config.webhook_secret); showToast('Secret copied') }}
                    style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', ...F('12px'), fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#374151' }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* What data is extracted */}
            <div style={card}>
              <h3 style={{ ...F('14px'), fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>What data is captured from each event</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Invoice Number', 'Extracted from message text (e.g. "Invoice #1234")'],
                  ['Party Name', 'Customer/vendor name from the invoice'],
                  ['Amount', 'Total invoice amount (₹)'],
                  ['Mobile Number', 'Customer mobile from the BUSY record'],
                  ['Event Date', 'Voucher date from the message'],
                  ['Auto Lead Creation', 'If party not found in CRM, a new lead is created automatically'],
                ].map(([field, desc]) => (
                  <div key={field} style={{ display: 'flex', gap: 10 }}>
                    <Check size={14} color="#059669" style={{ flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <span style={{ ...F('13px'), fontWeight: 600, color: '#111827' }}>{field}: </span>
                      <span style={{ ...F('13px'), color: '#6B7280' }}>{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LOGS TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ ...F('15px'), fontWeight: 700, color: '#111827', margin: 0 }}>Sync History</h3>
              <button onClick={loadLogs} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <RefreshCw size={14} style={logsLoading ? { animation: 'spin 0.8s linear infinite' } : {}} />
              </button>
            </div>

            {logsLoading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', ...F('14px') }}>Loading logs...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', ...F('14px') }}>
                No sync logs yet. Run a sync or upload a CSV to see history here.
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 90px 1fr 1fr 1fr 1fr', padding: '10px 16px', background: '#F9FAFB', borderRadius: '8px 8px 0 0', gap: 8 }}>
                  {['Date', 'Type', 'Status', 'Entity', 'Imported', 'Skipped', 'Failed'].map(h => (
                    <span key={h} style={{ ...F('11px'), fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {logs.map(log => (
                  <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '100px 80px 90px 1fr 1fr 1fr 1fr', padding: '12px 16px', borderBottom: '1px solid #F9FAFB', gap: 8, alignItems: 'center' }}>
                    <span style={{ ...F('12px'), color: '#6B7280' }}>{fmtDate(log.created_at)}</span>
                    <span style={{ ...F('12px'), color: '#374151', textTransform: 'capitalize' }}>{log.sync_type.replace('_', ' ')}</span>
                    <span style={pill(log.status === 'success' ? 'green' : log.status === 'partial' ? 'orange' : 'red')}>{log.status}</span>
                    <span style={{ ...F('12px'), color: '#374151', textTransform: 'capitalize' }}>{log.entity_type ?? '—'}</span>
                    <span style={{ ...F('13px'), color: '#059669', fontWeight: 600 }}>{log.records_imported}</span>
                    <span style={{ ...F('13px'), color: '#D97706', fontWeight: 600 }}>{log.records_skipped}</span>
                    <span style={{ ...F('13px'), color: log.records_failed > 0 ? '#DC2626' : '#9CA3AF', fontWeight: 600 }}>{log.records_failed}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
