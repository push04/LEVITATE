'use client';

import { useState } from 'react';
import { Bot, Upload, Download, Check, ChevronRight, Zap } from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import ImportModal from '@/components/import/ImportModal';

type TabId = 'agent' | 'csv';

export default function BusinessIntegrationsPage() {
  const portal = useCompanyPortalState();
  const [tab, setTab] = useState<TabId>('agent');
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

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

  const tabBtn = (id: TabId) => ({
    padding: '10px 0', marginRight: 28, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
    background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: tab === id ? '2px solid #B08D57' : '2px solid transparent',
    color: tab === id ? '#B08D57' : '#6B7280', transition: 'all 0.15s',
  } as React.CSSProperties);

  return (
    <div style={{ padding: '0 0 80px', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        apiEndpoint="/api/business/leads/import"
        extraPayload={{ company_id: portal.companyId }}
        enableWhatsApp={true}
        sourceLabel="file_import"
        onSuccess={(r) => showToast(`Imported ${r.imported} leads${r.skipped ? `, ${r.skipped} skipped` : ''}`)}
      />

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
        <button style={tabBtn('agent')} onClick={() => setTab('agent')}>
          <span style={{ marginRight: 5, display: 'inline-flex', verticalAlign: 'middle' }}><Bot size={13} color={tab === 'agent' ? '#B08D57' : '#9CA3AF'} /></span>
          LEVITATE Agent (Busy Sync)
        </button>
        <button style={tabBtn('csv')} onClick={() => setTab('csv')}>
          <span style={{ marginRight: 5, display: 'inline-flex', verticalAlign: 'middle' }}><Upload size={13} color={tab === 'csv' ? '#B08D57' : '#9CA3AF'} /></span>
          CSV / Excel Import
        </button>
      </div>

      {/* ── AGENT TAB ─────────────────────────────────────────────────────── */}
      {tab === 'agent' && (
        <div style={{ maxWidth: 680 }}>

          {/* Hero + single download CTA */}
          <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 20, color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={24} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>LEVITATE Sync Agent</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>Auto-syncs Busy Accounting customers to your CRM — completely free</p>
              </div>
              <div style={{ marginLeft: 'auto', background: '#22c55e', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>FREE</div>
            </div>

            {/* Big single button */}
            <a
              href="/api/business/integrations/busy/installer"
              download="levitate_setup.bat"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'white', color: '#1e1b4b', borderRadius: 12, padding: '16px 24px', fontWeight: 800, fontSize: 15, textDecoration: 'none', marginBottom: 14, transition: 'opacity 0.15s' }}
            >
              <Download size={18} />
              Download One-Click Installer (.bat)
            </a>

            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.65)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Check size={11} color="#86efac" /> Auto-installs Python if needed</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Check size={11} color="#86efac" /> Auto-detects your Busy folder</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Check size={11} color="#86efac" /> Adds itself to Windows startup</span>
            </div>
          </div>

          {/* API key step — the ONE manual thing */}
          <div style={{ background: '#FFF7ED', border: '2px solid #FED7AA', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#9A3412', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} color="#EA580C" /> One thing you need before running the installer
            </p>
            <p style={{ fontSize: 13, color: '#7C2D12', margin: '0 0 10px', lineHeight: 1.6 }}>
              Generate an API key first — the installer will ask you to paste it. That&apos;s the only manual step.
            </p>
            <a
              href="/business/dashboard/api-keys"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EA580C', color: 'white', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
              Get my API key <ChevronRight size={13} />
            </a>
          </div>

          {/* How it works — collapsed steps */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>What happens when you double-click it</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Installs Python 3.12', 'Downloads and installs silently if not already on the machine.'],
                ['Downloads the sync agent', 'Pulls the latest agent files from LEVITATE servers.'],
                ['Installs Access ODBC driver', 'Required to read Busy .bds database files directly.'],
                ['Detects your Busy folder', 'Scans common Busy paths automatically — no folder browsing needed.'],
                ['Saves your config', 'Writes config.json with your API key, site URL, and Busy path.'],
                ['Adds to Windows startup', 'Creates a startup entry so it syncs automatically after every login.'],
                ['Runs first sync', 'Pushes your Busy customers to CRM immediately.'],
              ].map(([title, desc], i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{i + 1}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What it syncs */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 24px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>What gets synced</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Customers / Parties', 'Name, mobile, email, city, GSTIN, balance — all as CRM leads.', '👥'],
                ['Sales Invoices', 'Bill numbers, amounts, and dates stored for reference.', '📄'],
                ['Smart dedup', 'Same customer synced again? Skipped — not duplicated.', '♻️'],
                ['Every hour, automatically', 'Runs in the background. No manual steps ever.', '⏱️'],
              ].map(([title, desc, emoji]) => (
                <div key={title} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontSize: 18, margin: '0 0 6px' }}>{emoji}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0', lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── CSV / EXCEL IMPORT TAB ─────────────────────────────────────────── */}
      {tab === 'csv' && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Import contacts from CSV or Excel</h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.6 }}>
              Upload CSV, XLS, or XLSX files — Busy exports, Excel sheets, or your own contact lists.
              Column names are auto-detected. Supports files with hundreds of thousands of rows.
              After import, you can instantly launch a WhatsApp campaign to all imported contacts.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {['CSV', 'XLS', 'XLSX', 'Up to 200 MB', 'Auto column mapping', 'WhatsApp campaigns'].map((f) => (
                <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#059669' }}>
                  <Check size={11} /> {f}
                </span>
              ))}
            </div>

            <button
              onClick={() => setImportOpen(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: '#B08D57', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              <Upload size={16} />
              Open Import Wizard
            </button>
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
