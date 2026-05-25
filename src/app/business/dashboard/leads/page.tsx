'use client';

import { Fragment, useMemo, useRef, useState } from 'react';
import { ClipboardList, Copy, Filter, Sparkles, Upload, X, ChevronRight, FileSpreadsheet, Check } from 'lucide-react';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import LeadCard from '@/components/business/ui/LeadCard';
import SearchInput from '@/components/business/ui/SearchInput';
import SkeletonBlock from '@/components/business/ui/SkeletonBlock';
import StatCard from '@/components/business/ui/StatCard';
import Toast from '@/components/business/ui/Toast';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import { useCompanyCrmLeads } from '@/hooks/useCompanyCrmLeads';
import { type BusinessLeadRecord, useBusinessLeadRecords } from '@/hooks/useBusinessLeadRecords';

type LeadFilter = 'all' | 'new' | 'engaged' | 'closed';
type CsvRow = Record<string, string>;

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
  { value: 'status', label: 'Status' },
];

const CSV_AUTO_MAP: Record<string, string> = {
  'name': 'business_name', 'account name': 'business_name', 'party name': 'business_name', 'company': 'business_name', 'business name': 'business_name',
  'contact name': 'name', 'contact': 'name',
  'email': 'email', 'email id': 'email', 'e-mail': 'email',
  'phone': 'phone', 'mobile': 'phone', 'mobile no': 'phone', 'mobile no.': 'phone', 'phone no': 'phone',
  'city': 'city', 'location': 'city',
  'category': 'service_category', 'service category': 'service_category', 'account group': 'service_category', 'group': 'service_category',
  'budget': 'budget', 'opening balance': 'budget', 'balance': 'budget',
  'notes': 'notes', 'remark': 'notes', 'remarks': 'notes',
};

function autoMapHeaders(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) { const m = CSV_AUTO_MAP[h.toLowerCase().trim()]; if (m) result[h] = m; }
  return result;
}

const FILTER_LABELS: Record<LeadFilter, string> = {
  all: 'All leads',
  new: 'New',
  engaged: 'In progress',
  closed: 'Closed',
};

function formatLeadForCopy(companyName: string, lead: BusinessLeadRecord) {
  return [
    `Workspace: ${companyName}`,
    `Lead: ${lead.name}`,
    `Status: ${lead.status ?? 'New'}`,
    lead.service_category ? `Category: ${lead.service_category}` : null,
    lead.business_type ? `Business type: ${lead.business_type}` : null,
    lead.city ? `City: ${lead.city}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    typeof lead.deal_value === 'number' ? `Pipeline value: INR ${lead.deal_value.toLocaleString('en-IN')}` : null,
    lead.notes ? `Notes: ${lead.notes}` : null,
    lead.message ? `Message: ${lead.message}` : null,
    `Created: ${new Date(lead.created_at).toLocaleDateString('en-IN')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function matchesFilter(record: BusinessLeadRecord, filter: LeadFilter) {
  const status = String(record.status || '').toLowerCase();
  if (filter === 'new') return status === 'new';
  if (filter === 'engaged') return status === 'contacted' || status === 'follow up' || status === 'follow_up' || status === 'in progress' || status === 'in_progress';
  if (filter === 'closed') return status === 'closed' || status === 'won' || status === 'lost';
  return true;
}

export default function BusinessLeadsPage() {
  const portal = useCompanyPortalState();
  const { records, loading, stats, updatingId, updateStatus } = useBusinessLeadRecords(
    Boolean(portal.hasPaidAccess) && !portal.loading,
    portal.companyId
  );
  const crm = useCompanyCrmLeads(
    Boolean(portal.hasPaidAccess) && !portal.loading,
    portal.companyName || portal.workspaceUrl || 'business'
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [copyState, setCopyState] = useState<string | null>(null);
  const [crmCopyState, setCrmCopyState] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // CSV import state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const csvDropRef = useRef<HTMLDivElement>(null);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      if (!matchesFilter(record, filter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        record.name,
        record.email,
        record.phone,
        record.status,
        record.service_category,
        record.business_type,
        record.city,
        record.notes,
        record.message,
        record.source,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [filter, records, search]);

  const filterCounts = useMemo(
    () => ({
      all: records.length,
      new: records.filter((record) => matchesFilter(record, 'new')).length,
      engaged: records.filter((record) => matchesFilter(record, 'engaged')).length,
      closed: records.filter((record) => matchesFilter(record, 'closed')).length,
    }),
    [records]
  );

  const filteredPipelineValue = useMemo(
    () =>
      filteredRecords.reduce((sum, record) => sum + (typeof record.deal_value === 'number' ? record.deal_value : 0), 0),
    [filteredRecords]
  );

  const handleCsvFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      triggerToast('File too large. Maximum 50 MB.');
      return;
    }
    setCsvFile(file); setCsvResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const { headers, rows } = parseCsvText(e.target?.result as string);
      setCsvHeaders(headers); setCsvRows(rows); setCsvMapping(autoMapHeaders(headers));
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
    // Chunk into 300-row batches to avoid request body size limits
    const CHUNK = 300;
    let totalImported = 0, totalSkipped = 0, totalFailed = 0;
    for (let i = 0; i < mapped.length; i += CHUNK) {
      const chunk = mapped.slice(i, i + CHUNK);
      try {
        const res = await fetch('/api/business/leads/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: chunk, company_id: portal.companyId }),
        });
        const json = await res.json();
        if (json.success) {
          totalImported += json.imported ?? 0;
          totalSkipped  += json.skipped  ?? 0;
          totalFailed   += json.failed   ?? 0;
        } else {
          totalFailed += chunk.length;
        }
      } catch {
        totalFailed += chunk.length;
      }
    }
    setCsvUploading(false);
    setCsvResult({ imported: totalImported, skipped: totalSkipped, failed: totalFailed });
    triggerToast(`Imported ${totalImported} leads${totalSkipped ? `, ${totalSkipped} skipped` : ''}`);
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2200);
  };

  const handleCopyOne = async (record: BusinessLeadRecord) => {
    try {
      await navigator.clipboard.writeText(formatLeadForCopy(portal.companyName, record));
      setCopyState(record.id);
      triggerToast(`Lead copied for ${record.name}`);
      window.setTimeout(() => setCopyState(null), 1800);
    } catch (error) {
      console.error('Failed to copy lead record:', error);
    }
  };

  const handleCopyVisible = async () => {
    if (filteredRecords.length === 0) {
      return;
    }

    try {
      const payload = filteredRecords.map((record) => formatLeadForCopy(portal.companyName, record)).join('\n\n---\n\n');
      await navigator.clipboard.writeText(payload);
      setCopyState('all');
      triggerToast(`${filteredRecords.length} visible leads copied`);
      window.setTimeout(() => setCopyState(null), 1800);
    } catch (error) {
      console.error('Failed to copy visible lead records:', error);
    }
  };

  const handleCopyField = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      triggerToast(`${label} copied`);
    } catch (error) {
      console.error(`Failed to copy ${label}:`, error);
      triggerToast(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  const handleCopyToCrm = async (record: BusinessLeadRecord) => {
    if (crm.sourceLeadIds.has(record.id)) {
      triggerToast(`${record.name} is already in your CRM`);
      return;
    }

    try {
      setCrmCopyState(record.id);
      await crm.copyLeadToCrm(record.id, record);
      triggerToast(`${record.name} copied to your CRM`);
    } catch (error) {
      console.error('Failed to add lead to CRM:', error);
      triggerToast(error instanceof Error ? error.message : 'Unable to copy lead to CRM');
    } finally {
      window.setTimeout(() => setCrmCopyState(null), 1200);
    }
  };

  const handleUpdateStatus = async (record: BusinessLeadRecord, nextStatus: string) => {
    try {
      await updateStatus(record.id, nextStatus);
      triggerToast(`Status updated for ${record.name}`);
    } catch (error) {
      console.error('Failed to update lead status:', error);
      triggerToast(error instanceof Error ? error.message : 'Unable to update lead status');
    }
  };

  if (portal.loading) {
    return (
      <div className="space-y-6">
        <section className={`${styles.panel} overflow-hidden p-6 md:p-8`}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:items-start">
            <div className="space-y-4">
              <SkeletonBlock className="h-6 w-48" rounded="rounded-full" />
              <SkeletonBlock className="h-12 w-[min(720px,92%)]" />
              <SkeletonBlock className="h-4 w-[min(640px,88%)]" />
              <SkeletonBlock className="h-4 w-[min(520px,82%)]" />
            </div>
            <div className={`${styles.panel} p-5`}>
              <SkeletonBlock className="h-4 w-32" rounded="rounded-full" />
              <SkeletonBlock className="mt-4 h-10 w-40" />
              <SkeletonBlock className="mt-4 h-16 w-full" />
              <SkeletonBlock className="mt-4 h-10 w-full" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${styles.panel} p-6`}>
                <SkeletonBlock className="h-3 w-24" rounded="rounded-full" />
                <SkeletonBlock className="mt-4 h-10 w-28" />
                <SkeletonBlock className="mt-5 h-10 w-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

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

  return (
    <>
      <div className="space-y-6">
        <section className={`${styles.panel} overflow-hidden p-6 md:p-8`}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label uppercase text-[var(--gold-bright)]">
                <Sparkles className="h-3.5 w-3.5" />
                Lead operating layer
              </div>
              <h1 className="mt-5 type-hero text-[var(--text-primary)]">Lead desk built for fast-moving Indian sales teams</h1>
              <p className="mt-4 max-w-3xl type-body text-[var(--text-secondary)]">
                Search, triage, and export the live lead pipeline from one place. Every record is presented as a structured business brief instead of a flat CRM row.
              </p>
            </div>

            <div className={`${styles.panel} bg-[linear-gradient(135deg,rgba(201,165,90,0.08)_0%,rgba(201,165,90,0.02)_70%)] p-5`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Visible pipeline</div>
              <div className="mt-3 type-stat text-[var(--text-primary)]">{formatCurrency(filteredPipelineValue)}</div>
              <p className="mt-3 type-body text-[var(--text-secondary)]">
                {filteredRecords.length} of {records.length} leads in view across the current search and status filters.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyVisible}
                  disabled={filteredRecords.length === 0}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" />
                  {copyState === 'all' ? 'Visible leads copied' : 'Copy visible leads'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCsvOpen(true); setCsvResult(null); }}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Leads"
              value={stats.total}
              tone="gold"
              detail="Combined active lead records"
              trend={[26, 34, 40, 49, 56, 62, 74, 88]}
            />
            <StatCard
              label="New"
              value={stats.newCount}
              tone="new"
              detail="Fresh entries awaiting first action"
              trend={[18, 24, 19, 28, 35, 31, 42, 46]}
            />
            <StatCard
              label="In Progress"
              value={stats.engaged}
              tone="progress"
              detail="Leads currently in touch or follow-up"
              trend={[14, 18, 22, 24, 27, 31, 38, 41]}
            />
            <StatCard
              label="Closed"
              value={stats.closed}
              tone="closed"
              detail="Won or concluded pipeline records"
              trend={[8, 12, 14, 18, 21, 24, 29, 34]}
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className={`${styles.panel} p-4 md:p-5`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by business, contact, city, category, notes, or source..."
                className="w-full"
              />
              <div className="flex flex-wrap gap-2">
                {(['all', 'new', 'engaged', 'closed'] as LeadFilter[]).map((value) => {
                  const active = filter === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 type-label uppercase ${
                        active
                          ? 'border-[var(--border-strong)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {FILTER_LABELS[value]}
                      <span className="rounded-full bg-[var(--bg-overlay)] px-2 py-0.5 type-mono text-[10px] text-[var(--text-primary)]">
                        {filterCounts[value]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className={`${styles.panel} p-5`}>
            <div className="type-subheading text-[var(--text-tertiary)]">Workflow note</div>
            <p className="mt-3 type-body text-[var(--text-secondary)]">
              Use the copy action to move a polished lead brief into WhatsApp, email, or your own CRM without losing the original context.
            </p>
            <div className="mt-4 space-y-3">
              {[
                'Contact pills now copy email and phone details directly with a toast confirmation.',
                'Copy any source lead into your own CRM, then edit status, prices, and notes there.',
                'Export respects the exact current filter so ops teams can hand off focused lists.',
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--gold-base)]" />
                  <p className="type-body text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
            {crm.storageMode === 'local' ? (
              <p className="mt-4 text-xs text-[var(--gold-base)]">
                CRM is running in browser-persistent local storage until the backend CRM schema is installed.
              </p>
            ) : null}
            {crm.error ? <p className="mt-4 text-xs text-[#f1a0a0]">{crm.error}</p> : null}
          </aside>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className={`${styles.panel} p-12 text-center type-body text-[var(--text-secondary)]`}>
              Loading lead records...
            </div>
          ) : filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <LeadCard
                key={record.id}
                lead={record}
                onCopy={() => handleCopyOne(record)}
                onCopyField={handleCopyField}
                onAddToCrm={() => handleCopyToCrm(record)}
                onUpdateStatus={(nextStatus: string) => handleUpdateStatus(record, nextStatus)}
                statusUpdating={updatingId === record.id}
                crmState={
                  crmCopyState === record.id
                    ? 'copying'
                    : crm.sourceLeadIds.has(record.id)
                      ? 'copied'
                      : 'idle'
                }
                copied={copyState === record.id}
              />
            ))
          ) : (
            <div className={`${styles.panel} p-12 text-center`}>
              <ClipboardList className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
              <h2 className="mt-5 type-title text-[var(--text-primary)]">
                {records.length === 0 ? 'Lead desk is ready for new activity' : 'No leads match this view'}
              </h2>
              <p className="mx-auto mt-3 max-w-xl type-body text-[var(--text-secondary)]">
                {records.length === 0
                  ? 'As soon as fresh lead records land in your workspace, they will appear here with score, status, and pipeline context.'
                  : 'Try widening your search or switching the status filter to bring more of the pipeline back into view.'}
              </p>
            </div>
          )}
        </section>
      </div>

      <Toast visible={toastVisible} message={toastMessage} />

      {/* CSV Import Modal */}
      {csvOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={16} color="#B08D57" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Import Leads from CSV</span>
              </div>
              <button onClick={() => setCsvOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Drop zone */}
              <div
                ref={csvDropRef}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) handleCsvFile(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById('biz-csv-input')?.click()}
                style={{ border: '2px dashed #D1D5DB', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: csvFile ? '#F0FDF4' : '#F9FAFB', marginBottom: 20 }}
              >
                <FileSpreadsheet size={28} color={csvFile ? '#059669' : '#9CA3AF'} style={{ margin: '0 auto 8px', display: 'block' }} />
                {csvFile ? (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', margin: 0 }}>{csvFile.name}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{csvRows.length} rows · Click to change</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Drop your CSV file here</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>or click to browse · .csv files only</p>
                  </>
                )}
                <input id="biz-csv-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCsvFile(e.target.files[0])} />
              </div>

              {/* Column mapper */}
              {csvHeaders.length > 0 && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Map CSV Columns to Lead Fields</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr', gap: '8px 10px', alignItems: 'center', marginBottom: 16 }}>
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
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#F9FAFB' }}>{csvHeaders.map(h => <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                      <tbody>{csvRows.slice(0, 3).map((row, i) => <tr key={i}>{csvHeaders.map(h => <td key={h} style={{ padding: '8px 10px', fontSize: 12, color: '#374151', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #F9FAFB' }}>{row[h]}</td>)}</tr>)}</tbody>
                    </table>
                  </div>

                  {csvResult && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 20, alignItems: 'center' }}>
                      <Check size={14} color="#059669" />
                      <span style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>{csvResult.imported} imported</span>
                      {csvResult.skipped > 0 && <span style={{ fontSize: 13, color: '#D97706', fontWeight: 600 }}>{csvResult.skipped} skipped</span>}
                      {csvResult.failed > 0 && <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{csvResult.failed} failed</span>}
                    </div>
                  )}

                  <button
                    onClick={uploadCsv}
                    disabled={csvUploading}
                    style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: '#B08D57', color: 'white', fontSize: 14, fontWeight: 600, cursor: csvUploading ? 'not-allowed' : 'pointer', opacity: csvUploading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Upload size={14} />
                    {csvUploading ? 'Importing...' : `Import ${csvRows.length} Leads`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
