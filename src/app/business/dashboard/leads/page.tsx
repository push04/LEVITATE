'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Copy, Filter, Sparkles } from 'lucide-react';
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
              <button
                type="button"
                onClick={handleCopyVisible}
                disabled={filteredRecords.length === 0}
                className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                {copyState === 'all' ? 'Visible leads copied' : 'Copy visible leads'}
              </button>
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
                onUpdateStatus={(nextStatus) => handleUpdateStatus(record, nextStatus)}
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
    </>
  );
}
