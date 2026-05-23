'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Database, IndianRupee, MapPinned, PencilLine, TrendingUp, Users } from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import { type CompanyCrmLead, useCompanyCrmLeads } from '@/hooks/useCompanyCrmLeads';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { GoldButton, PipelineBar, SearchInput, SkeletonBlock, StatCard, Toast } from '@/components/business/ui';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildTrend(value: number) {
  return [30, 42, 38, 52, 48, 66, 61, 79].map((step, index) => Math.min(100, step + Math.min(value * 3, 18) + index));
}

function commercialValue(lead: CompanyCrmLead) {
  return lead.negotiated_price ?? lead.quoted_price ?? lead.estimated_value ?? 0;
}

function groupedBarTone(index: number) {
  return ['var(--gold-base)', 'var(--gold-muted)', 'var(--status-progress)', 'var(--status-new)'][index] ?? 'var(--gold-base)';
}

function inputClass() {
  return 'w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--gold-glow)]';
}

function GroupedCategoryBars({
  rows,
}: {
  rows: Array<{ label: string; primary: number; secondary: number }>;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => Math.max(row.primary, row.secondary)));

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={row.label} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="type-body text-[var(--text-primary)]">{row.label}</div>
            <div className="type-mono text-[var(--text-secondary)]">{row.primary + row.secondary}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-20 shrink-0 type-caption">Active</div>
              <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-[var(--bg-overlay)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((row.primary / maxValue) * 100, row.primary > 0 ? 8 : 0)}%`,
                    background: groupedBarTone(index),
                  }}
                />
              </div>
              <div className="w-8 type-mono text-[var(--text-secondary)]">{row.primary}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 shrink-0 type-caption">Closed</div>
              <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-[var(--bg-overlay)]">
                <div
                  className="h-full rounded-full bg-[var(--status-closed)]"
                  style={{
                    width: `${Math.max((row.secondary / maxValue) * 100, row.secondary > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
              <div className="w-8 type-mono text-[var(--text-secondary)]">{row.secondary}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BusinessCrmPage() {
  const portal = useCompanyPortalState();
  const crmScopeKey = portal.companyName || portal.workspaceUrl || 'business';
  const crm = useCompanyCrmLeads(Boolean(portal.hasPaidAccess) && !portal.loading, crmScopeKey);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<Partial<CompanyCrmLead> | null>(null);
  const [savingLead, setSavingLead] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return crm.leads;

    return crm.leads.filter((lead) =>
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.company_name,
        lead.city,
        lead.service_category,
        lead.notes,
        lead.priority,
        lead.pipeline_stage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [crm.leads, search]);

  const stageLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const stage of crm.stages) {
      map.set(String(stage.stage_key ?? '').toLowerCase(), stage.label);
    }
    return map;
  }, [crm.stages]);

  const stageLabel = useMemo(() => {
    return (value: unknown) => {
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const stageKey = typeof record.stage_key === 'string' ? record.stage_key : typeof record.stageKey === 'string' ? record.stageKey : '';
        const label = typeof record.label === 'string' ? record.label : '';
        if (stageKey) {
          const fromMap = stageLabelByKey.get(stageKey.toLowerCase());
          return fromMap ?? stageKey.replace(/[_-]+/g, ' ');
        }
        if (label) return label;
      }

      const key = typeof value === 'string' ? value.trim() : '';
      if (!key) return 'New';
      const fromMap = stageLabelByKey.get(key.toLowerCase());
      return fromMap ?? key.replace(/[_-]+/g, ' ');
    };
  }, [stageLabelByKey]);

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedLeadId) ?? crm.leads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null,
    [crm.leads, filteredLeads, selectedLeadId]
  );

  useEffect(() => {
    if (selectedLead) {
      setSelectedLeadId(selectedLead.id);
      setEditorState(selectedLead);
    } else {
      setEditorState(null);
    }
  }, [selectedLead]);

  const topCategories = useMemo(() => {
    const counts = new Map<string, { active: number; closed: number }>();
    for (const lead of crm.leads) {
      const key = lead.service_category || 'Uncategorized';
      const current = counts.get(key) ?? { active: 0, closed: 0 };
      if (['won', 'lost', 'closed'].includes(String(lead.pipeline_stage || '').toLowerCase())) {
        current.closed += 1;
      } else {
        current.active += 1;
      }
      counts.set(key, current);
    }

    return Array.from(counts.entries())
      .sort((left, right) => right[1].active + right[1].closed - (left[1].active + left[1].closed))
      .slice(0, 4)
      .map(([label, value]) => ({ label, primary: value.active, secondary: value.closed }));
  }, [crm.leads]);

  const topCities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of crm.leads) {
      const key = lead.city || 'Unassigned';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  }, [crm.leads]);

  const totalDistribution = Math.max(crm.stats.total, 1);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2200);
  };

  const handleCopySummary = async () => {
    const text = [
      `Business: ${portal.companyName}`,
      `CRM leads: ${crm.stats.total}`,
      `New: ${crm.stats.newCount}`,
      `In progress: ${crm.stats.engaged}`,
      `Closed: ${crm.stats.closed}`,
      `Commercial value: ${formatCurrency(crm.stats.totalValue)}`,
      `Backlink: ${portal.workspaceUrl ?? 'Pending'}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      triggerToast('CRM summary copied');
    } catch (error) {
      console.error('Failed to copy CRM summary:', error);
      triggerToast('Unable to copy CRM summary');
    }
  };

  const handleSaveLead = async () => {
    if (!selectedLead || !editorState) {
      return;
    }

    try {
      setSavingLead(true);
      await crm.updateLead(selectedLead.id, editorState);
      triggerToast(`${editorState.name ?? selectedLead.name} updated`);
    } catch (error) {
      console.error('Failed to update CRM lead:', error);
      triggerToast(error instanceof Error ? error.message : 'Unable to save CRM lead');
    } finally {
      setSavingLead(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${selectedLead.name}" from your private CRM?\n\nThis removes the record only from your CRM. It does not delete the source lead.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingLead(true);
      await crm.deleteLead(selectedLead.id);
      setSelectedLeadId(null);
      setEditorState(null);
      triggerToast('CRM lead deleted');
    } catch (error) {
      console.error('Failed to delete CRM lead:', error);
      triggerToast(error instanceof Error ? error.message : 'Unable to delete CRM lead');
    } finally {
      setDeletingLead(false);
    }
  };

  if (portal.loading) {
    return (
      <div className="space-y-7">
        <section className={`${styles.panel} premium-noise-panel p-6 md:p-8`}>
          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-40" rounded="rounded-full" />
            <SkeletonBlock className="h-12 w-[min(760px,92%)]" />
            <SkeletonBlock className="h-4 w-[min(640px,88%)]" />
            <SkeletonBlock className="h-4 w-[min(520px,82%)]" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${styles.panel} p-6`}>
              <SkeletonBlock className="h-3 w-24" rounded="rounded-full" />
              <SkeletonBlock className="mt-4 h-10 w-28" />
              <SkeletonBlock className="mt-5 h-10 w-full" />
            </div>
          ))}
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
      <div className="space-y-7">
        <section className={`${styles.panel} premium-noise-panel p-6 md:p-8`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="type-subheading text-[var(--gold-base)]">Private CRM</div>
              <h1 className="mt-3 type-hero text-[var(--text-primary)]">Business-owned CRM pipeline</h1>
              <p className="mt-3 max-w-3xl type-body text-[var(--text-secondary)]">
                This CRM is separate from the source lead feed. Copy leads in from the Leads desk, then edit names, status, prices, and notes without mutating the original source record.
              </p>
              {crm.storageMode === 'local' ? (
                <div className="mt-4 inline-flex max-w-3xl items-start gap-2 rounded-[12px] border border-[rgba(201,165,90,0.22)] bg-[rgba(201,165,90,0.08)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold-base)]" strokeWidth={1.5} />
                  <span>
                    Backend CRM tables are not installed on this project yet, so your copied leads are being stored in persistent browser storage for this business workspace until the SQL migration is added.
                  </span>
                </div>
              ) : null}
              {crm.error ? (
                <div className="mt-4 inline-flex max-w-3xl items-start gap-2 rounded-[12px] border border-[rgba(176,95,87,0.24)] bg-[rgba(176,95,87,0.09)] px-4 py-3 text-sm leading-6 text-[var(--status-warn)]">
                  <span>{crm.error}</span>
                </div>
              ) : null}
            </div>
            <GoldButton variant="ghost" iconLeft={<Copy className="h-4 w-4" />} onClick={handleCopySummary}>
              Copy CRM summary
            </GoldButton>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="CRM Leads" value={crm.stats.total} tone="gold" trend={buildTrend(crm.stats.total)} />
          <StatCard label="New" value={crm.stats.newCount} tone="new" trend={buildTrend(crm.stats.newCount)} />
          <StatCard label="In Progress" value={crm.stats.engaged} tone="progress" trend={buildTrend(crm.stats.engaged)} />
          <StatCard label="Closed" value={crm.stats.closed} tone="closed" trend={buildTrend(crm.stats.closed)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className={`${styles.panel} ${styles.panelHover} min-h-[180px] p-6 md:p-7`}>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-[var(--gold-base)]" strokeWidth={1.5} />
              <div className="type-heading text-[var(--text-primary)]">Commercial Value</div>
            </div>
            <div className="mt-6 font-data text-[clamp(36px,5vw,52px)] leading-none text-[var(--text-primary)]">
              {formatCurrency(crm.stats.totalValue)}
            </div>
            <p className="mt-4 max-w-2xl type-body text-[var(--text-secondary)]">
              Combined estimated, quoted, and negotiated value across leads that now belong to your private CRM.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/business/dashboard/leads"
                className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:translate-y-[-1px]"
              >
                Add from Leads
              </Link>
              <div className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 type-label text-[var(--text-secondary)]">
                <IndianRupee className="h-4 w-4 text-[var(--gold-base)]" />
                {portal.workspaceUrl ?? 'Backlink pending'}
              </div>
            </div>
          </div>

          <div className={`${styles.panel} p-6`}>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[var(--gold-base)]" strokeWidth={1.5} />
              <div className="type-heading text-[var(--text-primary)]">Stage Momentum</div>
            </div>
            <div className="mt-6 space-y-5">
              <PipelineBar label="New" value={crm.stats.newCount} max={totalDistribution} color="new" />
              <PipelineBar label="In Progress" value={crm.stats.engaged} max={totalDistribution} color="progress" />
              <PipelineBar label="Closed" value={crm.stats.closed} max={totalDistribution} color="closed" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className={`${styles.panel} ${styles.panelHover} p-6`}>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-[var(--gold-base)]" strokeWidth={1.5} />
              <div className="type-heading text-[var(--text-primary)]">Category Mix</div>
            </div>
            <div className="mt-6">
              {topCategories.length > 0 ? (
                <GroupedCategoryBars rows={topCategories} />
              ) : (
                <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/60 px-4 py-8 text-center type-body text-[var(--text-secondary)]">
                  Category insights will appear once leads are copied into your CRM.
                </div>
              )}
            </div>
          </div>

          <div className={`${styles.panel} ${styles.panelHover} p-6`}>
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-[var(--gold-base)]" strokeWidth={1.5} />
              <div className="type-heading text-[var(--text-primary)]">City Coverage</div>
            </div>
            <div className="mt-6 space-y-4">
              {topCities.length > 0 ? (
                topCities.map(([city, count]) => (
                  <div key={city} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="type-body text-[var(--text-primary)]">{city}</span>
                      <span className="type-mono text-[var(--text-secondary)]">{count}</span>
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full bg-[var(--bg-overlay)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold-base),var(--gold-bright))]"
                        style={{ width: `${Math.max((count / totalDistribution) * 100, 10)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/60 px-4 py-8 text-center type-body text-[var(--text-secondary)]">
                  City insights will appear once leads are copied into your CRM.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className={`${styles.panel} p-5 md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="type-heading text-[var(--text-primary)]">Editable CRM records</div>
                <p className="mt-2 type-body text-[var(--text-secondary)]">
                  Copied leads live here. Open any record to update stage, value, pricing, and notes for your own business workflow.
                </p>
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder="Search copied CRM leads..." className="w-full max-w-[320px]" />
            </div>

            <div className="mt-5 space-y-3">
              {crm.loading ? (
                <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/60 px-4 py-10 text-center type-body text-[var(--text-secondary)]">
                  Loading private CRM leads...
                </div>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const active = lead.id === selectedLead?.id;
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => {
                        setSelectedLeadId(lead.id);
                        setEditorState(lead);
                      }}
                      className={`w-full rounded-[14px] border p-4 text-left transition-colors ${
                        active
                          ? 'border-[var(--border-strong)] bg-[var(--gold-glow)]/30'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-overlay)]/50 hover:border-[var(--border-default)]'
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="type-heading text-[var(--text-primary)]">{lead.name}</div>
                          <div className="mt-1 type-caption">
                            {[lead.company_name, lead.city, lead.service_category].filter(Boolean).join(' • ') || 'Business CRM lead'}
                          </div>
                        </div>
                        <div className="text-left md:text-right">
                          <div className="type-mono text-[var(--text-primary)]">{formatCurrency(commercialValue(lead))}</div>
                          <div className="mt-1 type-caption uppercase tracking-[0.16em] text-[var(--gold-bright)]">{stageLabel(lead.pipeline_stage)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/60 px-4 py-10 text-center type-body text-[var(--text-secondary)]">
                  Copy leads from the Leads desk to start building your private CRM.
                </div>
              )}
            </div>
          </div>

          <aside className={`${styles.panel} p-5 md:p-6`}>
            <div className="flex items-center gap-3">
              <PencilLine className="h-5 w-5 text-[var(--gold-base)]" strokeWidth={1.5} />
              <div className="type-heading text-[var(--text-primary)]">Lead editor</div>
            </div>

            {editorState ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Lead name</div>
                    <input className={inputClass()} value={editorState.name ?? ''} onChange={(event) => setEditorState((previous) => ({ ...previous, name: event.target.value }))} />
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Email</div>
                    <input className={inputClass()} value={editorState.email ?? ''} onChange={(event) => setEditorState((previous) => ({ ...previous, email: event.target.value }))} />
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Phone</div>
                    <input className={inputClass()} value={editorState.phone ?? ''} onChange={(event) => setEditorState((previous) => ({ ...previous, phone: event.target.value }))} />
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">City</div>
                    <input className={inputClass()} value={editorState.city ?? ''} onChange={(event) => setEditorState((previous) => ({ ...previous, city: event.target.value }))} />
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Category</div>
                    <input className={inputClass()} value={editorState.service_category ?? ''} onChange={(event) => setEditorState((previous) => ({ ...previous, service_category: event.target.value }))} />
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Pipeline stage</div>
                    <select
                      className={inputClass()}
                      value={editorState.pipeline_stage ?? 'new'}
                      onChange={(event) =>
                        setEditorState((previous) => ({
                          ...previous,
                          pipeline_stage: event.target.value,
                          status: event.target.value,
                        }))
                      }
                    >
                      {crm.stages.map((stage) => (
                        <option key={stage.id} value={stage.stage_key}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Priority</div>
                    <select
                      className={inputClass()}
                      value={editorState.priority ?? 'medium'}
                      onChange={(event) => setEditorState((previous) => ({ ...previous, priority: event.target.value }))}
                    >
                      {['low', 'medium', 'high'].map((value) => (
                        <option key={value} value={value}>
                          {value[0].toUpperCase() + value.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Estimated value</div>
                    <input
                      className={inputClass()}
                      type="number"
                      value={editorState.estimated_value ?? 0}
                      onChange={(event) => setEditorState((previous) => ({ ...previous, estimated_value: Number(event.target.value) }))}
                    />
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Quoted price</div>
                    <input
                      className={inputClass()}
                      type="number"
                      value={editorState.quoted_price ?? ''}
                      onChange={(event) => setEditorState((previous) => ({ ...previous, quoted_price: event.target.value === '' ? null : Number(event.target.value) }))}
                    />
                  </div>
                  <div>
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Negotiated price</div>
                    <input
                      className={inputClass()}
                      type="number"
                      value={editorState.negotiated_price ?? ''}
                      onChange={(event) => setEditorState((previous) => ({ ...previous, negotiated_price: event.target.value === '' ? null : Number(event.target.value) }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Notes</div>
                    <textarea
                      className={`${inputClass()} min-h-[140px]`}
                      value={editorState.notes ?? ''}
                      onChange={(event) => setEditorState((previous) => ({ ...previous, notes: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <GoldButton onClick={handleSaveLead} disabled={savingLead || deletingLead}>
                    {savingLead ? 'Saving lead...' : 'Save CRM lead'}
                  </GoldButton>
                  <button
                    type="button"
                    onClick={handleDeleteLead}
                    disabled={savingLead || deletingLead}
                    className="inline-flex items-center justify-center rounded-[10px] border border-[rgba(176,95,87,0.35)] bg-[rgba(176,95,87,0.10)] px-5 py-3 text-sm font-semibold text-[var(--status-warn)] transition-colors hover:bg-[rgba(176,95,87,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingLead ? 'Deleting lead...' : 'Delete CRM lead'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/60 px-4 py-8 text-center type-body text-[var(--text-secondary)]">
                Select a CRM lead to edit commercial details here.
              </div>
            )}
          </aside>
        </section>
      </div>

      <Toast visible={Boolean(toastMessage)} message={toastMessage} />
    </>
  );
}
