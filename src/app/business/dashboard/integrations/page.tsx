'use client';

import { Fragment, useState, useRef } from 'react';
import { Bot, Upload, Download, Terminal, Check, ChevronRight, FileSpreadsheet, X, Settings, Clock, Zap, RefreshCw } from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';

type CsvRow = Record<string, string>;
type TabId = 'agent' | 'csv';

function parseCsvText(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  function splitLine(line: string): string[] {
    const out: string[] = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim()); return out;
  }
  const headers = splitLine(lines[0]);
  return { headers, rows: lines.slice(1).map(l => { const v = splitLine(l); return Object.fromEntries(headers.map((h,i) => [h, v[i] ?? ''])); }) };
}

const CSV_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'business_name', label: 'Business Name' },
  { value: 'name', label: 'Contact Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'city', label: 'City' },
  { value: 'service_category', label: 'Category' },
  { value: 'budget', label: 'Budget' },
  { value: 'notes', label: 'Notes' },
];

const CSV_AUTO_MAP: Record<string, string> = {
  'name': 'business_name', 'account name': 'business_name', 'party name': 'business_name',
  'company': 'business_name', 'business name': 'business_name',
  'contact name': 'name', 'contact': 'name',
  'email': 'email', 'email id': 'email',
  'phone': 'phone', 'mobile': 'phone', 'mobile no': 'phone', 'mobile no.': 'phone',
  'city': 'city', 'location': 'city',
  'category': 'service_category', 'service category': 'service_category',
  'account group': 'service_category', 'group': 'service_category',
  'budget': 'budget', 'opening balance': 'budget', 'balance': 'budget',
  'notes': 'notes', 'remark': 'notes', 'remarks': 'notes',
};

function autoMap(headers: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (const h of headers) { const m = CSV_AUTO_MAP[h.toLowerCase().trim()]; if (m) r[h] = m; }
  return r;
}

export default function BusinessIntegrationsPage() {
  const portal = useCompanyPortalState();
  const [tab, setTab] = useState<TabId>('agent');

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [toast, setToast] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleFile = (file: File) => {
    setCsvFile(file); setCsvResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const { headers, rows } = parseCsvText(e.target?.result as string);
      setCsvHeaders(headers); setCsvRows(rows); setCsvMapping(autoMap(headers));
    };
    reader.readAsText(file);
  };

  const uploadCsv = async () => {
    if (!csvRows.length || !portal.companyId) return;
    setCsvUploading(true); setCsvResult(null);
    const mapped = csvRows.map(row => {
      const out: CsvRow = {};
      for (const [col, field] of Object.entries(csvMapping)) { if (field && row[col]) out[field] = row[col]; }
      return out;
    });
    const res = await fetch('/api/business/leads/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: mapped, company_id: portal.companyId }),
    });
    const json = await res.json();
    setCsvUploading(false);
    if (json.success) {
      setCsvResult({ imported: json.imported, skipped: json.skipped ?? 0, failed: json.failed ?? 0 });
      showToast(`Imported ${json.imported} leads`);
    } else {
      showToast('Import failed: ' + (json.error ?? 'Unknown error'));
    }
  };

  if (portal.loading) return null;

  if (!portal.hasPaidAccess) {
    return (
      <BusinessPortalLocked
        companyName={portal.companyName}
        subscriptionStatus={portal.subscriptionStatus}
        planName={portal.planName}
        billingCycle={portal.billingCycle}
        subdomainUrl={portal.workspaceUrl}
      />
    );
  }

  const tabBtn = (id: TabId, label: string) => ({
    padding: '10px 0', marginRight: 28, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
    background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: tab === id ? '2px solid #B08D57' : '2px solid transparent',
    color: tab === id ? '#B08D57' : '#6B7280', transition: 'all 0.15s',
  } as React.CSSProperties);

  return (
    <div style={{ padding: '0 0 80px', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#1A1916', color: '#F4F2EE', padding: '12px 20px', borderRadius: 10, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={14} color="#B08D57" />{toast}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Integrations</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Connect your Busy Accounting software and import contacts to LEVITATE.</p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: 28 }}>
        <button style={tabBtn('agent', 'LEVITATE Agent')} onClick={() => setTab('agent')}>
          <span style={{ marginRight: 5, display: 'inline-flex', verticalAlign: 'middle' }}><Bot size={13} color={tab === 'agent' ? '#B08D57' : '#9CA3AF'} /></span>
          LEVITATE Agent (Busy Sync)
        </button>
        <button style={tabBtn('csv', 'CSV Import')} onClick={() => setTab('csv')}>
          <span style={{ marginRight: 5, display: 'inline-flex', verticalAlign: 'middle' }}><Upload size={13} color={tab === 'csv' ? '#B08D57' : '#9CA3AF'} /></span>
          CSV Import
        </button>
      </div>

      {/* ── AGENT TAB ─────────────────────────────────────────────────────── */}
      {tab === 'agent' && (
        <div style={{ maxWidth: 720 }}>
          {/* Hero */}
          <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={24} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>LEVITATE Sync Agent</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>Auto-sync Busy Accounting data to your CRM leads — completely free</p>
              </div>
              <div style={{ marginLeft: 'auto', background: '#22c55e', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>FREE</div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0 }}>
              A small Windows program that runs on your Busy machine and syncs your customers + invoices to LEVITATE automatically. No third-party subscription. No manual exports.
            </p>
          </div>

          {/* 3-step setup */}
          <div style={{ background: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#14532D', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} color="#16A34A" /> 3-Step Setup
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center' }}>
              {[
                { n: '1', title: 'Download Agent', sub: 'ZIP → extract on Busy machine', btn: true, href: '/downloads/levitate_busy_agent.zip', label: 'Download ZIP' },
                null,
                { n: '2', title: 'Download Config', sub: 'Pre-filled with your site URL', btn: true, href: '/api/business/integrations/busy/agent-config', label: 'Download config.json' },
                null,
                { n: '3', title: 'Run setup.bat', sub: 'Installs driver + starts syncing', btn: false, href: '', label: '' },
              ].map((step, i) =>
                step === null ? (
                  <div key={i} style={{ textAlign: 'center', color: '#86EFAC', fontSize: 20, padding: '0 6px' }}>→</div>
                ) : (
                  <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 12px', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{step.n}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#14532D', margin: 0 }}>{step.title}</p>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '3px 0 10px', lineHeight: 1.4 }}>{step.sub}</p>
                    {step.btn ? (
                      <a href={step.href} download style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: '#111827', color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <Download size={11} />{step.label}
                      </a>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: 600 }}>
                        <Terminal size={11} /> Double-click it
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            <p style={{ fontSize: 11, color: '#16A34A', margin: '12px 0 0', fontWeight: 600 }}>
              ✓ No Python needed &nbsp;·&nbsp; ✓ Works with all Busy versions &nbsp;·&nbsp; ✓ Syncs every hour by default
            </p>
          </div>

          {/* API key note */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🔑</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF', margin: '0 0 4px' }}>Set your full API key in config.json</p>
              <p style={{ fontSize: 12, color: '#1E3A8A', margin: 0, lineHeight: 1.6 }}>
                The downloaded config.json shows only your key prefix. Before running setup.bat, open config.json and replace <code style={{ background: 'rgba(30,58,138,0.1)', padding: '0 4px', borderRadius: 3 }}>levitate_api_key</code> with your full key from{' '}
                <a href="/business/dashboard/api-keys" style={{ color: '#2563EB', fontWeight: 600 }}>API Keys →</a>
                {' '}(if you don&apos;t have one yet, generate it there first).
              </p>
            </div>
          </div>

          {/* What it syncs */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>What the agent syncs</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Customers / Parties', 'Appears as new leads in your CRM with GSTIN, address, city, balance.', '👥'],
                ['Sales Invoices', 'Invoice amounts and dates stored for reference and analysis.', '📄'],
                ['Auto Dedup', 'Leads with matching email are updated, not duplicated.', '♻️'],
                ['Scheduled Sync', 'Runs every hour in background — no manual steps needed.', '⏱️'],
              ].map(([title, desc, emoji]) => (
                <div key={title} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontSize: 20, margin: '0 0 8px' }}>{emoji}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0', lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Task scheduler tip */}
          <div style={{ background: '#FFFBF5', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Run automatically at Windows startup
            </p>
            <p style={{ fontSize: 12, color: '#78350F', margin: 0, lineHeight: 1.7 }}>
              Open <strong>Task Scheduler</strong> → Create Basic Task → At Startup → point to <code style={{ background: 'rgba(120,53,15,0.1)', padding: '0 4px', borderRadius: 3 }}>levitate_busy_agent.exe</code> with argument <code style={{ background: 'rgba(120,53,15,0.1)', padding: '0 4px', borderRadius: 3 }}>--once</code>.
              Or just leave <strong>run.bat</strong> open in the background.
            </p>
          </div>
        </div>
      )}

      {/* ── CSV IMPORT TAB ─────────────────────────────────────────────────── */}
      {tab === 'csv' && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Upload a CSV file</h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.6 }}>
              Import customers from any CSV — Busy exports, Excel sheets, or your own contact lists.
              Column names are auto-detected.
            </p>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) handleFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('biz-int-csv')?.click()}
              style={{ border: '2px dashed #D1D5DB', borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: csvFile ? '#F0FDF4' : '#F9FAFB', marginBottom: 20 }}
            >
              <FileSpreadsheet size={32} color={csvFile ? '#059669' : '#9CA3AF'} style={{ margin: '0 auto 10px', display: 'block' }} />
              {csvFile ? (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', margin: 0 }}>{csvFile.name}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{csvRows.length} rows · Click to change</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Drop your CSV here</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>or click to browse · .csv only</p>
                </>
              )}
              <input id="biz-int-csv" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            {/* Mapper */}
            {csvHeaders.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Map columns to CRM fields</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr', gap: '8px 10px', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>CSV Column</span>
                  <span />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Field</span>
                  {csvHeaders.map(h => (
                    <Fragment key={h}>
                      <div style={{ padding: '7px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</div>
                      <ChevronRight size={12} color="#D1D5DB" />
                      <select
                        value={csvMapping[h] ?? ''}
                        onChange={e => setCsvMapping(m => ({ ...m, [h]: e.target.value }))}
                        style={{ padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, background: 'white' }}
                      >
                        {CSV_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </Fragment>
                  ))}
                </div>

                {/* Preview */}
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Preview (first 3 rows)</p>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F9FAFB' }}>{csvHeaders.map(h => <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>{csvRows.slice(0, 3).map((row, i) => <tr key={i}>{csvHeaders.map(h => <td key={h} style={{ padding: '8px 10px', fontSize: 12, color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #F9FAFB' }}>{row[h]}</td>)}</tr>)}</tbody>
                  </table>
                </div>

                {csvResult && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 20, alignItems: 'center' }}>
                    <Check size={14} color="#059669" />
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>{csvResult.imported} imported</span>
                    {csvResult.skipped > 0 && <span style={{ fontSize: 13, color: '#D97706', fontWeight: 600 }}>{csvResult.skipped} skipped (dupes)</span>}
                    {csvResult.failed > 0 && <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{csvResult.failed} failed</span>}
                  </div>
                )}

                <button
                  onClick={uploadCsv}
                  disabled={csvUploading}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: '#B08D57', color: 'white', fontSize: 14, fontWeight: 600, cursor: csvUploading ? 'not-allowed' : 'pointer', opacity: csvUploading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {csvUploading ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={14} />}
                  {csvUploading ? 'Importing...' : `Import ${csvRows.length} Leads to CRM`}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </>
            )}
          </div>

          {/* How to export from Busy */}
          <div style={{ background: '#FFFBF5', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px 20px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={13} /> How to export from Busy
            </h3>
            {[
              ['Party/Customer List', 'Display → Account Books → Account List → ALT+E → CSV'],
              ['Sales Register', 'Display → Voucher Register → Sales → ALT+E → CSV'],
              ['Item Master', 'Display → Inventory Books → Item List → ALT+E → CSV'],
            ].map(([title, path]) => (
              <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <ChevronRight size={13} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>{title}: </span>
                  <code style={{ fontSize: 12, color: '#78350F', background: 'rgba(120,53,15,0.08)', padding: '1px 5px', borderRadius: 4 }}>{path}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
