'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, ExternalLink, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';
import ScoreArc from '@/components/business/ui/ScoreArc';
import SkeletonBlock from '@/components/business/ui/SkeletonBlock';
import StatusBadge from '@/components/business/ui/StatusBadge';
import Toast from '@/components/business/ui/Toast';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';

type ReportListItem = {
  id: string;
  status: string | null;
  target_name: string;
  target_type: string;
  intelligence_score: number | null;
  report_summary: string | null;
  created_at: string;
  archived_at: string | null;
  share_token: string | null;
  share_url: string | null;
};

type HistoryFilter = 'all' | 'complete' | 'shared' | 'archived';
type HistorySortKey = 'target' | 'score' | 'date';
type HistorySortDirection = 'asc' | 'desc';

const FILTER_LABELS: Record<HistoryFilter, string> = {
  all: 'All reports',
  complete: 'Complete',
  shared: 'Shared',
  archived: 'Archived',
};

const SORT_LABELS: Array<{ key: HistorySortKey; label: string }> = [
  { key: 'date', label: 'Newest first' },
  { key: 'score', label: 'Score' },
  { key: 'target', label: 'Target name' },
];

function getTargetVariant(targetType: string) {
  if (targetType === 'competitor') return 'new' as const;
  if (targetType === 'market') return 'gold' as const;
  if (targetType === 'industry') return 'progress' as const;
  if (targetType === 'product_idea') return 'neutral' as const;
  return 'active' as const;
}

function getStatusVariant(status: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'complete') return 'closed' as const;
  if (normalized === 'failed') return 'warn' as const;
  if (normalized === 'loading') return 'progress' as const;
  return 'neutral' as const;
}

export default function ReportHistoryClient() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [sortKey, setSortKey] = useState<HistorySortKey>('date');
  const [sortDirection, setSortDirection] = useState<HistorySortDirection>('desc');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shareState, setShareState] = useState<{ id: string; status: 'copying' | 'copied' } | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      try {
        const response = await fetch('/api/business/research/reports', { cache: 'no-store' });
        const data = await response.json();
        if (active && response.ok && data?.success) {
          setReports(data.data ?? []);
        } else if (active) {
          setMessage(data?.error || 'Unable to load report history');
        }
      } catch (error) {
        console.error('Unable to load reports', error);
        if (active) {
          setMessage('Unable to load report history');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      active = false;
    };
  }, []);

  const visibleReports = useMemo(() => {
    const filtered = reports.filter((report) => {
      if (filter === 'shared') return Boolean(report.share_token);
      if (filter === 'archived') return Boolean(report.archived_at);
      if (filter === 'complete') return report.status === 'complete';
      return true;
    });

    return [...filtered].sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (sortKey === 'target') {
        return left.target_name.localeCompare(right.target_name) * direction;
      }

      if (sortKey === 'score') {
        return ((left.intelligence_score ?? -1) - (right.intelligence_score ?? -1)) * direction;
      }

      return (new Date(left.created_at).getTime() - new Date(right.created_at).getTime()) * direction;
    });
  }, [filter, reports, sortDirection, sortKey]);

  const counts = useMemo(
    () => ({
      all: reports.length,
      complete: reports.filter((report) => report.status === 'complete').length,
      shared: reports.filter((report) => Boolean(report.share_token)).length,
      archived: reports.filter((report) => Boolean(report.archived_at)).length,
    }),
    [reports]
  );

  const showToast = (nextMessage: string) => {
    setToastMessage(nextMessage);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2200);
  };

  const toggleSort = (key: HistorySortKey) => {
    if (sortKey === key) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'target' ? 'asc' : 'desc');
  };

  const handleCopyShare = async (report: ReportListItem) => {
    if (!report.share_token || shareState?.status === 'copying') {
      return;
    }

    const shareUrl = report.share_url || `${window.location.origin}/shared/report/${report.share_token}`;
    setShareState({ id: report.id, status: 'copying' });

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState({ id: report.id, status: 'copied' });
      showToast('Shared report link copied');
      window.setTimeout(() => setShareState(null), 1800);
    } catch (error) {
      console.error('Unable to copy share link', error);
      setShareState(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <section className={`${styles.panel} p-6 md:p-8`}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <div>
              <div className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label uppercase text-[var(--gold-bright)]">
                Report archive
              </div>
              <h1 className="mt-5 type-hero text-[var(--text-primary)]">Saved intelligence reports with share-ready recall</h1>
              <p className="mt-4 max-w-3xl type-body text-[var(--text-secondary)]">
                Review past market analysis runs, reopen any report in one click, and surface the strongest work before the 30-day archive window closes.
              </p>
            </div>

            <div className={`${styles.panel} bg-[linear-gradient(135deg,rgba(201,165,90,0.08)_0%,rgba(201,165,90,0.02)_72%)] p-5`}>
              <div className="type-subheading text-[var(--text-tertiary)]">History snapshot</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div>
                  <div className="type-stat-sm text-[var(--text-primary)]">{counts.all}</div>
                  <div className="type-caption">Reports stored in this workspace</div>
                </div>
                <div>
                  <div className="type-stat-sm text-[var(--text-primary)]">{counts.shared}</div>
                  <div className="type-caption">Currently shareable outside the workspace</div>
                </div>
                <div>
                  <div className="type-stat-sm text-[var(--text-primary)]">{counts.archived}</div>
                  <div className="type-caption">Archived after the 30-day active window</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['all', 'complete', 'shared', 'archived'] as HistoryFilter[]).map((value) => {
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
                    {FILTER_LABELS[value]}
                    <span className="rounded-full bg-[var(--bg-overlay)] px-2 py-0.5 type-mono text-[10px] text-[var(--text-primary)]">
                      {counts[value]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {SORT_LABELS.map(({ key, label }) => {
                const active = sortKey === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSort(key)}
                    className={`rounded-full border px-3 py-2 type-label uppercase ${
                      active
                        ? 'border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)]'
                        : 'border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                    {active ? ` ${sortDirection === 'asc' ? 'A-Z' : 'Top'}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-[14px] border border-[rgba(138,92,58,0.45)] bg-[rgba(138,92,58,0.16)] px-4 py-3 type-body text-[var(--text-primary)]">
            {message}
          </div>
        ) : null}

        <section className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`skeleton-${index}`} className={`${styles.panel} p-5 md:p-6`}>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_200px_240px] xl:items-center">
                  <div className="space-y-3">
                    <SkeletonBlock height={12} width="24%" />
                    <SkeletonBlock height={24} width="62%" />
                    <SkeletonBlock height={12} width="100%" />
                    <SkeletonBlock height={12} width="82%" />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <SkeletonBlock height={90} width={110} borderRadius={14} />
                    <SkeletonBlock height={12} width="40%" />
                  </div>
                  <div className="space-y-3">
                    <SkeletonBlock height={14} width="44%" />
                    <SkeletonBlock height={12} width="72%" />
                    <div className="flex gap-3">
                      <SkeletonBlock height={42} width={120} borderRadius={10} />
                      <SkeletonBlock height={42} width={120} borderRadius={10} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : visibleReports.length === 0 ? (
            <div className={`${styles.panel} p-12 text-center`}>
              <h2 className="type-title text-[var(--text-primary)]">No reports in this view yet</h2>
              <p className="mx-auto mt-3 max-w-xl type-body text-[var(--text-secondary)]">
                Run a new analysis or switch the current filter to surface completed, shared, or archived reports from your workspace.
              </p>
            </div>
          ) : (
            visibleReports.map((report) => {
              const isExpanded = Boolean(expanded[report.id]);
              const shareStatus = shareState?.id === report.id ? shareState.status : null;
              const summary = report.report_summary || 'Saved report summary will appear here once the generation completes.';

              return (
                <article key={report.id} className={`${styles.panel} ${styles.panelHover} p-5 md:p-6`}>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_190px_240px] xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={getTargetVariant(report.target_type)}>
                          {report.target_type.replace(/_/g, ' ')}
                        </StatusBadge>
                        <StatusBadge variant={getStatusVariant(report.status)}>{report.status ?? 'saved'}</StatusBadge>
                        {report.archived_at ? <StatusBadge variant="warn">Archived</StatusBadge> : null}
                      </div>

                      <h2 className="mt-4 type-title text-[var(--text-primary)]">{report.target_name}</h2>
                      <p className={`mt-3 type-body text-[var(--text-secondary)] ${isExpanded ? '' : 'line-clamp-2'}`}>{summary}</p>
                      {summary.length > 140 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((previous) => ({
                              ...previous,
                              [report.id]: !previous[report.id],
                            }))
                          }
                          className="mt-3 type-label uppercase text-[var(--gold-bright)] hover:text-[var(--text-primary)]"
                        >
                          {isExpanded ? 'Show less' : 'See more'}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 p-4">
                      <ScoreArc value={report.intelligence_score ?? 0} label="Score" size={112} />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="type-subheading text-[var(--text-tertiary)]">Generated</div>
                        <div className="mt-2 type-mono text-[var(--text-primary)]">
                          {new Date(report.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/business/dashboard/reports/${report.id}`}
                          className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-4 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-px"
                        >
                          Open report
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>

                        {report.share_token ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyShare(report)}
                              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-overlay)]"
                            >
                              {shareStatus === 'copying' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : shareStatus === 'copied' ? (
                                <Check className="h-4 w-4 text-[var(--gold-bright)]" />
                              ) : (
                                <Share2 className="h-4 w-4" />
                              )}
                              {shareStatus === 'copying' ? 'Preparing...' : shareStatus === 'copied' ? 'Link copied' : 'Copy share link'}
                            </button>
                            <Link
                              href={report.share_url || `/shared/report/${report.share_token}`}
                              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                            >
                              Shared view
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      <Toast visible={toastVisible} message={toastMessage} />
    </>
  );
}
