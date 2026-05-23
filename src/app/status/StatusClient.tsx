'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type HealthTone = 'operational' | 'degraded' | 'down' | 'unknown';

type ServiceRow = {
  name: string;
  tone: HealthTone;
  lastChecked: string;
  error?: string;
};

type StatusApiResponse = {
  ok: boolean;
  timestamp: string;
  response_ms: number;
  infra: Array<{ name: string; healthy: boolean; latency_ms?: number; error?: string }>;
  agents: Array<{ name: string; healthy: boolean; error?: string }>;
};

function toneFromHealthy(healthy: boolean, error?: string): HealthTone {
  if (healthy) return 'operational';
  if (error?.toLowerCase().includes('not configured') || error?.toLowerCase().includes('not set')) return 'unknown';
  return 'degraded';
}

function StatusDot({ tone }: { tone: HealthTone }) {
  const base = 'inline-block rounded-full';
  const size = 'h-2.5 w-2.5';
  const color =
    tone === 'operational' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
    : tone === 'degraded' ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
    : tone === 'down' ? 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]'
    : 'bg-[var(--text-tertiary)]';
  return <span className={`${base} ${size} ${color} animate-levitate-pulse`} aria-hidden="true" />;
}

function SummaryPill({ tone, label }: { tone: HealthTone; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-sm">
      <StatusDot tone={tone} />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}

function ServiceRowCard({ row }: { row: ServiceRow }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 transition-colors hover:border-[var(--border-default)]">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.name}</div>
        {row.error ? (
          <div className="mt-1 text-xs text-amber-500/80 truncate">{row.error}</div>
        ) : (
          <div className="mt-1 text-xs text-[var(--text-tertiary)]">
            Last checked: {new Date(row.lastChecked).toLocaleString('en-IN')}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="type-label text-[var(--text-secondary)] capitalize">
          {row.tone === 'operational' ? 'Operational'
            : row.tone === 'degraded' ? 'Degraded'
            : row.tone === 'unknown' ? 'Not configured'
            : 'Down'}
        </span>
        <StatusDot tone={row.tone} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded-full bg-[var(--bg-overlay)] animate-levitate-shimmer" />
        <div className="h-2 w-24 rounded-full bg-[var(--bg-overlay)] animate-levitate-shimmer animation-delay-60" />
      </div>
      <div className="h-2.5 w-2.5 rounded-full bg-[var(--bg-overlay)] animate-levitate-shimmer" />
    </div>
  );
}

export default function StatusClient() {
  const [infra, setInfra] = useState<ServiceRow[]>([]);
  const [agents, setAgents] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StatusApiResponse = await res.json();

      setInfra(
        data.infra.map((s) => ({
          name: s.name,
          tone: toneFromHealthy(s.healthy, s.error),
          lastChecked: data.timestamp,
          error: s.error,
        }))
      );

      setAgents(
        data.agents.map((a) => ({
          name: a.name,
          tone: toneFromHealthy(a.healthy, a.error),
          lastChecked: data.timestamp,
          error: a.error,
        }))
      );

      setLastFetched(new Date(data.timestamp));
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = window.setInterval(fetchStatus, 30_000);
    return () => window.clearInterval(timer);
  }, [fetchStatus]);

  const summary = useMemo(() => {
    const all = [...infra, ...agents];
    if (all.length === 0) return { tone: 'unknown' as const, label: 'Checking systems…' };
    const down = all.filter((s) => s.tone === 'down').length;
    const degraded = all.filter((s) => s.tone === 'degraded').length;
    const affected = down + degraded;
    if (down > 0) return { tone: 'down' as const, label: `${affected} system${affected > 1 ? 's' : ''} affected` };
    if (degraded > 0) return { tone: 'degraded' as const, label: `${affected} system${affected > 1 ? 's' : ''} degraded` };
    return { tone: 'operational' as const, label: 'All systems operational' };
  }, [infra, agents]);

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="type-hero">Status</h1>
            <p className="mt-3 type-body text-[var(--text-secondary)]">
              Live health for infrastructure and all {agents.length || 16} agents.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && <SummaryPill tone={summary.tone} label={summary.label} />}
            <button
              onClick={fetchStatus}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              aria-label="Refresh status"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 16H3v5"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Last updated */}
        {lastFetched && (
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            Last updated: {lastFetched.toLocaleTimeString('en-IN')} · Auto-refreshes every 30 s
          </p>
        )}

        {/* Fetch error banner */}
        {fetchError && (
          <div className="mt-4 rounded-[14px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            Could not reach status API: {fetchError}
          </div>
        )}

        {/* Infrastructure */}
        <div className="mt-8 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="type-heading">Infrastructure</div>
          <div className="mt-4 grid gap-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : infra.map((s) => <ServiceRowCard key={s.name} row={s} />)}
          </div>
        </div>

        {/* Agents */}
        <div className="mt-8 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="type-heading">Agents</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 16 }).map((_, i) => <SkeletonRow key={i} />)
              : agents.map((s) => <ServiceRowCard key={s.name} row={s} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
