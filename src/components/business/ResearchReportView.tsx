'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, Link2, Loader2 } from 'lucide-react';
import {
  getResearchRunNextAttemptAt,
  registerResearchRun,
  unregisterResearchRun,
} from '@/components/business/BusinessResearchRunProvider';
import {
  RESEARCH_MODULES,
  normalizeResearchModuleResults,
  normalizeSelectedModules,
  type ResearchReportRecord,
} from '@/lib/business-intelligence';
import {
  ResearchModuleRenderer,
  ResearchModuleSkeleton,
} from '@/components/business/ResearchModuleRenderer';
import Toast from '@/components/business/ui/Toast';

const RUNNER_REFRESH_EVENT = 'business-research-runner-refresh';

async function downloadFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

function actionButtonClassName(variant: 'primary' | 'secondary' | 'ghost') {
  if (variant === 'primary') {
    return 'inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#d6b06a_0%,#b68745_100%)] px-4 py-3 text-sm font-semibold text-[#23170d] shadow-[0_12px_24px_rgba(182,135,69,0.22)] transition-transform hover:-translate-y-0.5';
  }

  if (variant === 'secondary') {
    return 'inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#dbcbb9] bg-[#fffaf3] px-4 py-3 text-sm font-semibold text-[#2f2217] transition-colors hover:border-[#c6ab84] hover:text-[#7d5928]';
  }

  return 'inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#dbcbb9] bg-transparent px-4 py-3 text-sm font-semibold text-[#6f5e50] transition-colors hover:border-[#c6ab84] hover:text-[#7d5928]';
}

function scoreTone(score: number | null) {
  if (score == null) return '#b68745';
  if (score >= 85) return '#b18433';
  if (score >= 70) return '#4a8a66';
  if (score >= 55) return '#b6843d';
  return '#b05f57';
}

function moduleJumpLinkClassName() {
  return 'inline-flex min-h-[42px] items-center rounded-full border border-[#d5bc95] bg-[linear-gradient(180deg,#fffefb_0%,#f7ead7_100%)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e4c23] shadow-[0_6px_16px_rgba(90,61,23,0.06)] transition-[color,border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#b98b48] hover:bg-[linear-gradient(180deg,#fff9ef_0%,#f2dfbf_100%)] hover:text-[#4f3414] hover:shadow-[0_12px_24px_rgba(90,61,23,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b98b48]';
}

function formatRetryCountdown(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function getClientErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : '';

  if (!message) {
    return fallback;
  }

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'LevitateOS could not refresh this report just now. We are retrying automatically in the background.';
  }

  if (/abort(ed|error)/i.test(message)) {
    return fallback;
  }

  return message;
}

function ReportScoreCard({
  score,
  status,
  totalModules,
  completedCount,
  failedCount,
  pendingCount,
  retryCountdownSeconds,
  compact = false,
}: {
  score: number | null;
  status: string;
  totalModules: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  retryCountdownSeconds: number | null;
  compact?: boolean;
}) {
  const normalized = Math.max(0, Math.min(score ?? 0, 100));
  const formattedRetryCountdown = formatRetryCountdown(retryCountdownSeconds);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const tone = scoreTone(score);
  const statusLabel =
    status === 'complete'
      ? 'Complete'
      : status === 'partial'
        ? 'Partial'
        : status === 'archived'
          ? 'Archived'
          : 'Running';
  const statusClasses =
    status === 'complete'
      ? 'border-[#cfe3d3] bg-[#eef7f0] text-[#3f7758]'
      : status === 'partial'
        ? 'border-[#e5d4b0] bg-[#faf1df] text-[#926a35]'
        : 'border-[#e5d4b0] bg-[#faf1df] text-[#926a35]';
  const completionPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  return (
    <div className={`rounded-[24px] border border-[#dccab5] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7ea_100%)] shadow-[0_18px_44px_rgba(73,48,19,0.08)] ${compact ? 'p-4' : 'p-5'}`}>
      <div className={`grid ${compact ? 'gap-4 xl:grid-cols-[168px_minmax(0,1fr)]' : 'gap-5 xl:grid-cols-[188px_minmax(0,1fr)]'} xl:items-start`}>
        <div className={`rounded-[22px] border border-[#dcc7a6] bg-[linear-gradient(180deg,#fffaf2_0%,#f8ecd8_100%)] shadow-[0_14px_32px_rgba(73,48,19,0.06)] ${compact ? 'p-3.5' : 'p-4'}`}>
          <div className={`text-center ${compact ? 'mb-2' : 'mb-3'}`}>
            <div className={`uppercase text-[#876a45] ${compact ? 'text-[9px] tracking-[0.24em]' : 'text-[10px] tracking-[0.28em]'}`}>
              Intelligence score
            </div>
          </div>

          <div className={`relative mx-auto shrink-0 ${compact ? 'h-[116px] w-[116px]' : 'h-[132px] w-[132px]'}`}>
            <svg viewBox="0 0 132 132" className="h-full w-full">
              <circle cx="66" cy="66" r={radius} stroke="#eadccc" strokeWidth="10" fill="none" />
              <circle
                cx="66"
                cy="66"
                r={radius}
                stroke={tone}
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 66 66)"
              />
            </svg>
            <div className="absolute inset-[16px] flex flex-col items-center justify-center rounded-full bg-[rgba(255,251,245,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <div className={`font-bold leading-none text-[#24190f] ${compact ? 'text-[2rem]' : 'text-[2.35rem]'}`}>{score ?? '--'}</div>
              <div className={`font-semibold text-[#7a6858] ${compact ? 'mt-1 text-[11px] tracking-[0.12em]' : 'mt-1.5 text-xs tracking-[0.16em]'}`}>
                /100
              </div>
            </div>
          </div>

          <div className={`text-center ${compact ? 'mt-3' : 'mt-4'}`}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#8b7354]">Execution progress</div>
            <div className={`font-bold text-[#24190f] ${compact ? 'mt-1 text-xl' : 'mt-2 text-2xl'}`}>{completionPercent}%</div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses}`}
            >
              {statusLabel}
            </span>
            <span className="rounded-full border border-[#e3d7c8] bg-[#fffdf9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6858]">
              {completedCount}/{totalModules} modules complete
            </span>
          </div>

          <div className={`rounded-[18px] border border-[#e5d9cb] bg-[#fffdf9] ${compact ? 'mt-3 p-3.5' : 'mt-4 p-4'}`}>
            <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.2em] text-[#8f7757]">
              <span>Report completion</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#efe3d3]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#d3ac67_0%,#b68745_100%)] transition-[width] duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          <div className={`grid gap-3 md:grid-cols-2 2xl:grid-cols-4 ${compact ? 'mt-3' : 'mt-4'}`}>
            <div className="rounded-[18px] border border-[#e4d7c7] bg-[#fffdf9] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">Completed</div>
              <div className="mt-2 text-2xl font-bold text-[#24190f]">{completedCount}</div>
            </div>
            <div className="rounded-[18px] border border-[#e4d7c7] bg-[#fffdf9] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">Waiting</div>
              <div className="mt-2 text-2xl font-bold text-[#24190f]">{pendingCount}</div>
            </div>
            <div className="rounded-[18px] border border-[#e4d7c7] bg-[#fffdf9] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">Failed</div>
              <div className="mt-2 text-2xl font-bold text-[#24190f]">{failedCount}</div>
            </div>
            <div className="rounded-[18px] border border-[#dac29b] bg-[linear-gradient(180deg,#fffaf1_0%,#f9ecd7_100%)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">
                {pendingCount > 0 ? 'Resume window' : 'State'}
              </div>
              <div className="mt-2 text-2xl font-bold text-[#24190f]">{pendingCount > 0 ? formattedRetryCountdown ?? 'Syncing' : 'Ready'}</div>
            </div>
          </div>

          <p className={`max-w-4xl text-sm leading-7 text-[#6d5d4f] ${compact ? 'mt-3' : 'mt-4'}`}>
            {pendingCount > 0
              ? 'Generation keeps running in the background while you move around the dashboard. Each queued section resumes automatically when the next execution window opens.'
              : failedCount > 0
                ? 'Completed sections are ready now. Any failed sections can be retried automatically if the report stays active in the dashboard.'
                : 'The full report is ready for export, sharing, and review.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResearchReportView({
  reportId,
  initialReport,
  readOnly = false,
}: {
  reportId?: string;
  initialReport?: ResearchReportRecord;
  readOnly?: boolean;
}) {
  const [report, setReport] = useState<ResearchReportRecord | null>(initialReport ?? null);
  const [loading, setLoading] = useState(!initialReport);
  const [message, setMessage] = useState('');
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle');
  const [toastVisible, setToastVisible] = useState(false);
  const [retryCountdownSeconds, setRetryCountdownSeconds] = useState<number | null>(null);
  const hasReportRef = useRef(Boolean(initialReport));

  const selectedModules = useMemo(() => (report ? normalizeSelectedModules(report.selectedModules) : []), [report]);
  const moduleLookup = useMemo(
    () => (report ? normalizeResearchModuleResults(report.moduleResults, report.targetName) : {}),
    [report]
  );

  const progress = useMemo(() => {
    const statuses = selectedModules.map((moduleId) => moduleLookup[moduleId]?.status ?? 'pending');
    return {
      total: selectedModules.length,
      completed: statuses.filter((status) => status === 'complete').length,
      failed: statuses.filter((status) => status === 'failed').length,
      pending: statuses.filter((status) => status === 'pending' || status === 'loading').length,
    };
  }, [moduleLookup, selectedModules]);

  const nextQueuedModule = useMemo(() => {
    return selectedModules
      .map((moduleId) => moduleLookup[moduleId] ?? { id: moduleId, status: 'pending' })
      .find((module) => module.status === 'pending' || module.status === 'loading');
  }, [moduleLookup, selectedModules]);

  const shouldKeepRunning =
    !readOnly &&
    Boolean(reportId) &&
    Boolean(report) &&
    (report?.status === 'generating' || progress.pending > 0);

  useEffect(() => {
    hasReportRef.current = Boolean(report);
  }, [report]);

  const loadReport = useCallback(
    async (showSpinner = false) => {
      if (!reportId || readOnly) {
        return;
      }

      if (showSpinner) {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/business/research/reports/${reportId}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Unable to load report');
        }

        setReport(data.data);
        if (!showSpinner) {
          setMessage('');
        }
      } catch (error) {
        if (showSpinner || !hasReportRef.current) {
          setMessage(getClientErrorMessage(error, 'Unable to load report'));
        }
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [readOnly, reportId]
  );

  useEffect(() => {
    if (readOnly || !reportId) {
      setLoading(false);
      return;
    }

    void loadReport(!initialReport);
  }, [initialReport, loadReport, readOnly, reportId]);

  useEffect(() => {
    if (!reportId || readOnly) {
      return;
    }

    function onRefresh(event: Event) {
      const detail = (event as CustomEvent<{ reportId?: string }>).detail;
      if (!detail?.reportId || detail.reportId === reportId) {
        void loadReport(false);
      }
    }

    window.addEventListener(RUNNER_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(RUNNER_REFRESH_EVENT, onRefresh);
  }, [loadReport, readOnly, reportId]);

  useEffect(() => {
    if (!shouldKeepRunning || !reportId) {
      if (reportId) {
        unregisterResearchRun(reportId);
      }
      return;
    }

    const existingNextAttempt = getResearchRunNextAttemptAt(reportId);
    if (!existingNextAttempt || existingNextAttempt <= Date.now()) {
      registerResearchRun(reportId, 3000);
    }
    const interval = window.setInterval(() => {
      void loadReport(false);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loadReport, reportId, shouldKeepRunning]);

  useEffect(() => {
    if (!toastVisible) {
      return;
    }

    const timeout = window.setTimeout(() => setToastVisible(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastVisible]);

  useEffect(() => {
    if (!reportId || readOnly || !shouldKeepRunning) {
      setRetryCountdownSeconds(null);
      return;
    }

    const updateCountdown = () => {
      const nextAttemptAt = getResearchRunNextAttemptAt(reportId);
      if (!nextAttemptAt) {
        setRetryCountdownSeconds(null);
        return;
      }

      const seconds = Math.max(0, Math.ceil((nextAttemptAt - Date.now()) / 1000));
      setRetryCountdownSeconds(seconds);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [readOnly, reportId, shouldKeepRunning]);

  const stickyLinks = useMemo(() => {
    return selectedModules
      .map((moduleId) => RESEARCH_MODULES.find((item) => item.id === moduleId))
      .filter(Boolean);
  }, [selectedModules]);

  if (loading || !report) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-[#dccab5] bg-[#fffaf3] p-6 shadow-[0_18px_48px_rgba(73,48,19,0.08)]">
          <Loader2 className="h-8 w-8 animate-spin text-[#c19348]" />
          <div className="mt-4 text-[#786a5d]">Loading report shell...</div>
        </div>
        {RESEARCH_MODULES.slice(0, 3).map((item) => (
          <ResearchModuleSkeleton key={item.id} title={item.title} />
        ))}
      </div>
    );
  }

  const shareButtonLabel =
    shareState === 'loading'
      ? 'Creating backlink...'
      : shareState === 'copied'
        ? 'Link copied'
        : 'Share report';
  const reportFacts = [
    {
      label: 'Business context',
      value: report.businessProfile?.businessName || 'Not attached',
      detail: report.businessProfile?.businessName ? 'Used to frame benchmarks and recommendations.' : 'This report was generated without company-specific context.',
    },
    {
      label: 'Generated',
      value: new Date(report.createdAt).toLocaleString('en-IN'),
      detail: 'Latest completed snapshot saved in LevitateOS.',
    },
    {
      label: 'Modules',
      value: `${progress.total} selected`,
      detail: `${progress.completed} complete, ${progress.pending} in queue, ${progress.failed} flagged.`,
    },
    {
      label: 'Delivery mode',
      value: readOnly ? 'Shared backlink' : 'Workspace report',
      detail: readOnly ? 'Read-only external presentation mode.' : 'Editable from the business dashboard workspace.',
    },
  ];

  return (
    <>
      <div className={`rounded-[32px] bg-[#efe6d7] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${readOnly ? 'space-y-5 p-2.5 sm:p-3' : 'space-y-6 p-3 sm:p-4'}`}>
        {message ? (
          <div className="rounded-[18px] border border-[rgba(171,80,80,0.22)] bg-[rgba(163,68,68,0.08)] px-4 py-3 text-sm text-[#8e4a4a]">
            {message}
          </div>
        ) : null}

        {retryCountdownSeconds && retryCountdownSeconds > 0 ? (
          <div className="rounded-[20px] border border-[#d6c09d] bg-[linear-gradient(135deg,#fbf3e6_0%,#fffaf3_100%)] px-5 py-4 shadow-[0_18px_40px_rgba(73,48,19,0.06)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6d2d]">Capacity queue active</div>
                <div className="mt-2 text-base font-semibold text-[#24190f]">
                  {nextQueuedModule?.title ?? 'The next module'} will resume automatically when the current capacity window closes.
                </div>
                <div className="mt-1 text-sm leading-6 text-[#6d5d4f]">
                  The run is stored in this browser, survives refresh/navigation, and keeps processing module by module without consuming extra daily quota.
                </div>
              </div>
              <div className="rounded-[18px] border border-[#d6c09d] bg-[#fffdf9] px-4 py-3 text-center shadow-[0_12px_24px_rgba(73,48,19,0.05)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">Resume window</div>
                <div className="mt-1 text-3xl font-bold text-[#24190f]">{formatRetryCountdown(retryCountdownSeconds)}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`rounded-[28px] border border-[#dccab5] bg-[rgba(255,251,245,0.96)] shadow-[0_20px_60px_rgba(73,48,19,0.08)] ${readOnly ? 'p-5 md:p-6' : 'p-6 md:p-8'}`}>
          <div>
            <div className="inline-flex rounded-full border border-[#d5bc95] bg-[#f8efde] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6d2d]">
              Report Summary
            </div>
            <h1 className="mt-4 max-w-5xl text-3xl font-bold leading-tight text-[#23180f] sm:text-[2.2rem]">{report.targetName}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#786a5d]">
              {report.businessProfile?.businessName
                ? `Framed relative to ${report.businessProfile.businessName}.`
                : 'No business context was attached to this report.'}{' '}
              Generated on {new Date(report.createdAt).toLocaleString('en-IN')}.
            </p>
            {report.reportSummary ? (
              <div className="mt-5 rounded-[22px] border border-[#e2d3c2] bg-[#fffdf9] p-5 text-sm leading-7 text-[#33271d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {report.reportSummary}
              </div>
            ) : null}
          </div>

          {readOnly ? (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {reportFacts.map((fact) => (
                <div key={fact.label} className="rounded-full border border-[#dccab5] bg-[linear-gradient(180deg,#fffdf8_0%,#f8eedf_100%)] px-3.5 py-2 shadow-[0_8px_20px_rgba(73,48,19,0.04)]">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">{fact.label}</span>
                  <span className="ml-2 text-sm font-semibold text-[#24190f]">{fact.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {reportFacts.map((fact) => (
                <div key={fact.label} className="rounded-[20px] border border-[#dccab5] bg-[linear-gradient(180deg,#fffdf8_0%,#f8eedf_100%)] px-4 py-4 shadow-[0_14px_30px_rgba(73,48,19,0.05)]">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">{fact.label}</div>
                  <div className="mt-2 text-sm font-semibold text-[#24190f]">{fact.value}</div>
                  <div className="mt-1 text-xs leading-5 text-[#786a5d]">{fact.detail}</div>
                </div>
              ))}
            </div>
          )}

          {!readOnly ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={async () => {
                  await downloadFromUrl(`/api/business/research/reports/${report.id}/export?format=pdf`, `levitate-report-${report.id}.pdf`);
                }}
                className={actionButtonClassName('primary')}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={async () => {
                  await downloadFromUrl(`/api/business/research/reports/${report.id}/export?format=docx`, `levitate-report-${report.id}.docx`);
                }}
                className={actionButtonClassName('secondary')}
              >
                <Download className="h-4 w-4" />
                Download DOCX
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShareState('loading');
                  setMessage('');

                  try {
                    const response = await fetch(`/api/business/research/reports/${report.id}/share`, { method: 'POST' });
                    const data = await response.json();
                    if (!response.ok || !data?.success) {
                      throw new Error(data?.error || 'Unable to share report');
                    }

                    await navigator.clipboard.writeText(data.data.url);
                    setShareState('copied');
                    setToastVisible(true);
                    window.setTimeout(() => setShareState('idle'), 1800);
                  } catch (error) {
                    setShareState('idle');
                    setMessage(getClientErrorMessage(error, 'Unable to share report'));
                  }
                }}
                disabled={shareState === 'loading'}
                className={`${actionButtonClassName('ghost')} disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {shareState === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : shareState === 'copied' ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {shareButtonLabel}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-[#dccab5] bg-[#fffdf9] px-5 py-4 shadow-[0_14px_30px_rgba(73,48,19,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8f7757]">Shared presentation</div>
              <div className="mt-2 text-base font-semibold text-[#24190f]">External readers are viewing a clean read-only backlink.</div>
              <p className="mt-2 text-sm leading-6 text-[#6d5d4f]">
                LevitateOS keeps the report structured for client delivery, while the workspace version retains exports, retries, and operational controls.
              </p>
            </div>
          )}

            <div className={`${readOnly ? 'mt-5' : 'mt-6'}`}>
              <ReportScoreCard
                score={report.intelligenceScore}
                status={report.status}
                totalModules={progress.total}
                completedCount={progress.completed}
                failedCount={progress.failed}
                pendingCount={progress.pending}
                retryCountdownSeconds={retryCountdownSeconds}
                compact={readOnly}
              />
            </div>
        </div>

        <div
          className={`rounded-[22px] border border-[#d7c0a0] bg-[rgba(255,249,241,0.98)] px-4 py-3 shadow-[0_14px_34px_rgba(73,48,19,0.08)] ${
            readOnly ? 'relative z-0' : 'sticky top-0 z-20 backdrop-blur'
          }`}
        >
          <div className={readOnly ? 'flex gap-2 overflow-x-auto pb-1' : 'flex flex-wrap gap-2'}>
            {stickyLinks.map((link) => (
              <a
                key={link?.id}
                href={`#${link?.id}`}
                className={`${moduleJumpLinkClassName()} ${readOnly ? 'shrink-0 whitespace-nowrap' : ''}`}
              >
                {link?.shortLabel}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {selectedModules.map((moduleId) => (
            <ResearchModuleRenderer
              key={moduleId}
              targetName={report.targetName}
              compact={readOnly}
              retryCountdownSeconds={nextQueuedModule?.id === moduleId ? retryCountdownSeconds : null}
              module={
                moduleLookup[moduleId] ?? {
                  id: moduleId,
                  title: RESEARCH_MODULES.find((item) => item.id === moduleId)?.title ?? moduleId,
                  status: 'pending',
                }
              }
            />
          ))}
        </div>
      </div>

      <Toast visible={toastVisible} message="Backlink copied to clipboard" />
    </>
  );
}
