'use client';

import { Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { ResearchModuleResult } from '@/lib/business-intelligence';

interface RendererProps {
  module: ResearchModuleResult & { status: string };
  targetName?: string;
  compact?: boolean;
  retryCountdownSeconds?: number | null;
}

interface SkeletonProps {
  title: string;
}

export function ResearchModuleSkeleton({ title }: SkeletonProps) {
  return (
    <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-[8px] bg-[var(--border-default)]" />
        <div className="h-4 w-48 rounded bg-[var(--border-default)]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[var(--border-default)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--border-default)]" />
        <div className="h-3 w-4/5 rounded bg-[var(--border-default)]" />
      </div>
      <p className="mt-4 text-xs text-[var(--text-tertiary)]">Generating {title}…</p>
    </div>
  );
}

export function ResearchModuleRenderer({ module, targetName, compact, retryCountdownSeconds }: RendererProps) {
  const { status, title, payload, error } = module;

  const statusIcon =
    status === 'complete' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    status === 'failed' ? <AlertCircle className="h-4 w-4 text-red-400" /> :
    status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin text-[var(--gold-base)]" /> :
    <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />;

  return (
    <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          {statusIcon}
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        {retryCountdownSeconds ? (
          <span className="text-xs text-[var(--text-tertiary)]">Retry in {retryCountdownSeconds}s</span>
        ) : null}
      </div>

      {status === 'failed' && error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {status === 'loading' && (
        <p className="text-sm text-[var(--text-secondary)]">Analysing{targetName ? ` ${targetName}` : ''}…</p>
      )}

      {status === 'pending' && (
        <p className="text-sm text-[var(--text-tertiary)]">Queued — will start shortly.</p>
      )}

      {status === 'complete' && payload && (
        <div className={compact ? 'space-y-2' : 'space-y-4'}>
          {payload.summary && (
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{payload.summary}</p>
          )}
          {payload.score !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-tertiary)]">Score</span>
              <span className="font-semibold text-[var(--gold-base)]">{payload.score}/100</span>
            </div>
          )}
          {(payload as any).bullets?.length > 0 && !compact && (
            <ul className="space-y-1.5">
              {(payload as any).bullets.map((b: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold-base)]" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
