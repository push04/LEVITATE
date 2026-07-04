'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { ClipboardList, Copy, Filter, Sparkles, Upload, Search, Brain, Plus, CheckCircle2, Loader2, ChevronDown, Database, Star, Phone, Globe } from 'lucide-react';
import ImportModal from '@/components/import/ImportModal';
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
import { downloadCsv } from '@/lib/csv-export';

type PageTab = 'my-leads' | 'find-leads' | 'browse-db';
type LeadFilter = 'all' | 'new' | 'engaged' | 'closed';
type FindMode = 'manual' | 'ai';

interface ScrapedResult {
  business_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  city?: string | null;
  category?: string | null;
  ai_score?: number | null;
  source?: string | null;
  raw_data?: Record<string, unknown> | null;
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

  const [importOpen, setImportOpen] = useState(false);
  const [pageTab, setPageTab] = useState<PageTab>('my-leads');

  // Find Leads state
  const [findMode, setFindMode] = useState<FindMode>('manual');
  const [findCity, setFindCity] = useState('');
  const [findCategory, setFindCategory] = useState('');
  const [findQuery, setFindQuery] = useState('');
  const [findLoading, setFindLoading] = useState(false);
  const [findResults, setFindResults] = useState<ScrapedResult[]>([]);
  const [findError, setFindError] = useState('');
  const [findSearched, setFindSearched] = useState(false);
  const [crmAddState, setCrmAddState] = useState<Record<string, 'idle' | 'adding' | 'added'>>({});
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  // Browse DB state
  const [dbLeads, setDbLeads] = useState<ScrapedResult[]>([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(1);
  const [dbCity, setDbCity] = useState('');
  const [dbCategory, setDbCategory] = useState('');
  const [dbLoading, setDbLoading] = useState(false);
  const [dbAddState, setDbAddState] = useState<Record<string, 'idle' | 'adding' | 'added'>>({});
  const [dbCapped, setDbCapped] = useState(false);
  const [dbCapLimit, setDbCapLimit] = useState<number | null>(null);

  const loadDbLeads = useCallback(async (page = 1, city = dbCity, cat = dbCategory) => {
    setDbLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (city) params.set('city', city);
      if (cat) params.set('category', cat);
      params.set('min_score', '5');
      const r = await fetch(`/api/business/leads/browse?${params}`);
      const d = await r.json() as { data: ScrapedResult[]; total: number; capped?: boolean; capLimit?: number | null };
      setDbLeads(d.data ?? []);
      setDbTotal(d.total ?? 0);
      setDbPage(page);
      setDbCapped(Boolean(d.capped));
      setDbCapLimit(d.capLimit ?? null);
    } catch { /* ignore */ } finally {
      setDbLoading(false);
    }
  }, [dbCity, dbCategory]);

  useEffect(() => {
    if (pageTab === 'browse-db') loadDbLeads(1, dbCity, dbCategory);
  }, [pageTab]); // eslint-disable-line

  const handleDbAddToCrm = async (lead: ScrapedResult, key: string) => {
    setDbAddState(prev => ({ ...prev, [key]: 'adding' }));
    try {
      await fetch('/api/business/leads/search/add-to-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      setDbAddState(prev => ({ ...prev, [key]: 'added' }));
    } catch {
      setDbAddState(prev => ({ ...prev, [key]: 'idle' }));
    }
  };

  const loadSelects = useCallback(async () => {
    if (citiesList.length > 0) return;
    try {
      const r = await fetch('/api/business/leads/search');
      if (r.ok) {
        const d = await r.json() as { cities: string[]; categories: string[] };
        setCitiesList(d.cities ?? []);
        setCategoriesList(d.categories ?? []);
      }
    } catch { /* ignore */ }
  }, [citiesList.length]);

  const handleFindLeads = async () => {
    setFindError('');
    setFindResults([]);
    setFindSearched(false);
    setFindLoading(true);
    try {
      const payload =
        findMode === 'ai'
          ? { mode: 'ai', query: findQuery, limit: 10 }
          : { mode: 'manual', city: findCity, category: findCategory, limit: 10 };
      const r = await fetch('/api/business/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json() as { success: boolean; leads?: ScrapedResult[]; error?: string; city?: string; category?: string };
      if (!d.success) {
        setFindError(d.error ?? 'Search failed');
      } else {
        setFindResults(d.leads ?? []);
        if (d.city && !findCity) setFindCity(d.city);
        if (d.category && !findCategory) setFindCategory(d.category);
      }
    } catch {
      setFindError('Network error. Try again.');
    } finally {
      setFindLoading(false);
      setFindSearched(true);
    }
  };

  const handleAddToCrm = async (lead: ScrapedResult, key: string) => {
    setCrmAddState(prev => ({ ...prev, [key]: 'adding' }));
    try {
      const r = await fetch('/api/business/leads/search/add-to-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      const d = await r.json() as { success: boolean; error?: string };
      if (!d.success) {
        triggerToast(d.error ?? 'Failed to add to CRM');
        setCrmAddState(prev => ({ ...prev, [key]: 'idle' }));
      } else {
        setCrmAddState(prev => ({ ...prev, [key]: 'added' }));
        triggerToast(`${lead.business_name} added to your CRM`);
      }
    } catch {
      triggerToast('Network error');
      setCrmAddState(prev => ({ ...prev, [key]: 'idle' }));
    }
  };

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
      {/* Tab switcher */}
      <div className="mb-6 flex gap-2">
        {(['my-leads', 'find-leads', 'browse-db'] as PageTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setPageTab(tab);
              if (tab === 'find-leads') loadSelects();
            }}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              pageTab === tab
                ? 'border-[var(--border-strong)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'my-leads' ? <ClipboardList className="h-4 w-4" /> : tab === 'find-leads' ? <Search className="h-4 w-4" /> : <Database className="h-4 w-4" />}
            {tab === 'my-leads' ? 'My Leads' : tab === 'find-leads' ? 'Find New Leads' : 'Browse Lead Database'}
          </button>
        ))}
      </div>

      {/* ── FIND NEW LEADS TAB ────────────────────────────────────── */}
      {pageTab === 'find-leads' && (
        <div className="space-y-6">
          <section className={`${styles.panel} p-6 md:p-8`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--gold-bright)]">
              <Brain className="h-3.5 w-3.5" />
              Advanced Lead Search
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              Find new business leads
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Scrape fresh leads from Nominatim, Bing, Sulekha, Zomato, and Practo. Results appear instantly — add any lead to your CRM with one click.
            </p>

            {/* Mode toggle */}
            <div className="mt-6 flex gap-2">
              {(['manual', 'ai'] as FindMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFindMode(m)}
                  className={`inline-flex items-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-medium transition-colors ${
                    findMode === m
                      ? 'border-[var(--gold-base)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {m === 'manual' ? <Filter className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {m === 'manual' ? 'Manual (city + category)' : 'AI (describe what you need)'}
                </button>
              ))}
            </div>

            {/* Search form */}
            <div className="mt-5">
              {findMode === 'manual' ? (
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1 min-w-[180px]">
                    <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">City</label>
                    <div className="relative">
                      <select
                        value={findCity}
                        onChange={e => setFindCity(e.target.value)}
                        className="w-full appearance-none rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2.5 pr-8 text-sm text-[var(--text-primary)] focus:border-[var(--gold-base)] focus:outline-none"
                      >
                        <option value="">Select city</option>
                        {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-3 h-4 w-4 text-[var(--text-tertiary)]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-w-[220px]">
                    <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Category</label>
                    <div className="relative">
                      <select
                        value={findCategory}
                        onChange={e => setFindCategory(e.target.value)}
                        className="w-full appearance-none rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2.5 pr-8 text-sm text-[var(--text-primary)] focus:border-[var(--gold-base)] focus:outline-none"
                      >
                        <option value="">Select category</option>
                        {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-3 h-4 w-4 text-[var(--text-tertiary)]" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFindLeads}
                    disabled={findLoading || !findCity || !findCategory}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {findLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {findLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
                    <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Describe what you need</label>
                    <input
                      type="text"
                      value={findQuery}
                      onChange={e => setFindQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && findQuery.trim()) handleFindLeads(); }}
                      placeholder="e.g. dental clinics in Pune, or gym owners in Delhi"
                      className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFindLeads}
                    disabled={findLoading || !findQuery.trim()}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {findLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    {findLoading ? 'Searching...' : 'Find with AI'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Results */}
          {findError && (
            <div className={`${styles.panel} p-5 border-l-4 border-l-red-400`}>
              <p className="text-sm text-red-400">{findError}</p>
            </div>
          )}

          {findSearched && !findError && findResults.length === 0 && (
            <div className={`${styles.panel} p-12 text-center`}>
              <Search className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
              <p className="mt-4 text-[var(--text-secondary)]">No leads found for this search. Try a different city or category.</p>
            </div>
          )}

          {findResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium px-1">
                {findResults.length} result{findResults.length !== 1 ? 's' : ''} — {findCity} / {findCategory}
              </p>
              {findResults.map((lead, i) => {
                const key = `${lead.business_name}-${i}`;
                const addState = crmAddState[key] ?? 'idle';
                return (
                  <div key={key} className={`${styles.panel} flex items-start justify-between gap-4 p-4`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--text-primary)] truncate">{lead.business_name}</span>
                        {lead.ai_score != null && lead.ai_score > 0 && (
                          <span className="rounded-full bg-[var(--gold-glow)] px-2 py-0.5 text-[10px] font-semibold text-[var(--gold-bright)]">
                            Score {lead.ai_score}
                          </span>
                        )}
                        {lead.source && (
                          <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)]">
                            {lead.source}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--text-secondary)]">
                        {lead.address && <span className="truncate max-w-[280px]">{lead.address}</span>}
                        {lead.phone && <span>{lead.phone}</span>}
                        {lead.email && <span>{lead.email}</span>}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-[var(--gold-base)] underline truncate max-w-[200px]">
                            {lead.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddToCrm(lead, key)}
                      disabled={addState !== 'idle'}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-xs font-semibold transition-colors ${
                        addState === 'added'
                          ? 'border-green-400/30 bg-green-400/10 text-green-400'
                          : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--gold-base)] hover:text-[var(--gold-base)] disabled:opacity-60'
                      }`}
                    >
                      {addState === 'adding' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : addState === 'added' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {addState === 'added' ? 'In CRM' : addState === 'adding' ? 'Adding...' : 'Add to CRM'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── BROWSE LEAD DATABASE TAB ──────────────────────────────── */}
      {pageTab === 'browse-db' && (
        <div className="space-y-5">
          <section className={`${styles.panel} p-6`}>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input
                placeholder="City (e.g. Mumbai)"
                value={dbCity}
                onChange={e => setDbCity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadDbLeads(1, dbCity, dbCategory)}
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <input
                placeholder="Category (e.g. dental clinic)"
                value={dbCategory}
                onChange={e => setDbCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadDbLeads(1, dbCity, dbCategory)}
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                onClick={() => loadDbLeads(1, dbCity, dbCategory)}
                disabled={dbLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
              >
                {dbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-secondary)]">
                {dbTotal.toLocaleString('en-IN')} pre-scraped leads available — instantly searchable, no wait time.
              </p>
              <button
                onClick={() => downloadCsv(
                  `lead-database-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    { key: 'business_name', label: 'Business Name' },
                    { key: 'city', label: 'City' },
                    { key: 'category', label: 'Category' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'website', label: 'Website' },
                    { key: 'address', label: 'Address' },
                    { key: 'ai_score', label: 'AI Score' },
                  ],
                  dbLeads
                )}
                disabled={dbLeads.length === 0}
                className="whitespace-nowrap rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export this page (CSV)
              </button>
            </div>
          </section>

          {dbLoading && (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading leads...
            </div>
          )}

          {!dbLoading && dbLeads.length > 0 && (
            <div className="space-y-3">
              {dbLeads.map((lead, i) => {
                const key = `${lead.business_name}-${i}`;
                const addSt = dbAddState[key] ?? 'idle';
                return (
                  <section key={key} className={`${styles.panel} p-4 flex flex-col md:flex-row gap-4`}>
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{lead.business_name}</h3>
                        {lead.ai_score != null && (
                          <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${lead.ai_score >= 7 ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>
                            <Star className="h-3 w-3" />{lead.ai_score}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                        {lead.city && <span>{lead.city}</span>}
                        {lead.category && <span className="capitalize">{lead.category}</span>}
                        {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-[var(--primary)]"><Phone className="h-3 w-3" />{lead.phone}</a>}
                        {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[var(--primary)]"><Globe className="h-3 w-3" />Website</a>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDbAddToCrm(lead, key)}
                      disabled={addSt !== 'idle'}
                      className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${addSt === 'added' ? 'bg-green-500/10 text-green-600' : 'bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20'} disabled:opacity-60`}
                    >
                      {addSt === 'adding' ? <Loader2 className="h-4 w-4 animate-spin" /> : addSt === 'added' ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {addSt === 'added' ? 'Added' : addSt === 'adding' ? 'Adding...' : 'Add to CRM'}
                    </button>
                  </section>
                );
              })}

              {/* Pagination */}
              {dbTotal > 50 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {((dbPage - 1) * 50) + 1}–{Math.min(dbPage * 50, dbTotal)} of {dbTotal.toLocaleString('en-IN')}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => loadDbLeads(dbPage - 1, dbCity, dbCategory)} disabled={dbPage === 1 || dbLoading} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm disabled:opacity-40">Prev</button>
                    <button onClick={() => loadDbLeads(dbPage + 1, dbCity, dbCategory)} disabled={dbPage * 50 >= dbTotal || dbLoading} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}

              {dbCapped && (
                <div className="rounded-2xl border border-[var(--gold-base)]/30 bg-[var(--gold-glow)] p-4 text-sm text-[var(--text-secondary)]">
                  You&apos;re viewing the first {dbCapLimit?.toLocaleString('en-IN')} leads available on your plan.{' '}
                  <a href="/business/dashboard/subscribe" className="font-semibold text-[var(--gold-bright)] underline">Upgrade your plan</a> to unlock the full lead database.
                </div>
              )}
            </div>
          )}

          {!dbLoading && dbLeads.length === 0 && dbTotal === 0 && (
            <div className="p-10 text-center text-[var(--text-secondary)] border border-dashed border-[var(--border-default)] rounded-2xl">
              No leads found. Try a different city or category.
            </div>
          )}
        </div>
      )}

      {/* ── MY LEADS TAB ─────────────────────────────────────────── */}
      {pageTab === 'my-leads' && (
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
                  onClick={() => setImportOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
                >
                  <Upload className="h-4 w-4" />
                  Import contacts
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv(
                    `my-leads-${new Date().toISOString().slice(0, 10)}.csv`,
                    [
                      { key: 'name', label: 'Name' },
                      { key: 'email', label: 'Email' },
                      { key: 'phone', label: 'Phone' },
                      { key: 'business_type', label: 'Business Type' },
                      { key: 'service_category', label: 'Category' },
                      { key: 'city', label: 'City' },
                      { key: 'status', label: 'Status' },
                      { key: 'deal_value', label: 'Deal Value' },
                      { key: 'budget', label: 'Budget' },
                      { key: 'ai_score', label: 'AI Score' },
                      { key: 'source', label: 'Source' },
                      { key: 'notes', label: 'Notes' },
                      { key: 'created_at', label: 'Created At' },
                    ],
                    filteredRecords
                  )}
                  disabled={filteredRecords.length === 0}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Export CSV
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
      )}

      <Toast visible={toastVisible} message={toastMessage} />

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        apiEndpoint="/api/business/leads/import"
        extraPayload={{ company_id: portal.companyId }}
        enableWhatsApp={true}
        sourceLabel="file_import"
        onSuccess={(r) => triggerToast(`Imported ${r.imported} leads${r.skipped ? `, ${r.skipped} skipped` : ''}`)}
      />
    </>
  );
}
