'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Clock3, Copy, Mail, Send, Workflow } from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type AgentData = {
  agent_name: string;
  label?: string;
  schedule?: string;
  current_balance: number;
  success_rate: number;
  is_suspended: boolean;
  tasks_last_24h: number;
  success_last_24h: number;
  failed_last_24h: number;
  last_log?: { action: string; status: string; created_at: string } | null;
};

type Schedule = {
  agent: string;
  schedule: string;
  next_run?: string;
};

type AgentLog = {
  id?: string;
  agent_name: string;
  action: string;
  status: string;
  credits_earned: number;
  created_at: string;
  duration_ms?: number | null;
};

type AgentEmail = {
  id: string;
  agent_name: string;
  direction: 'inbound' | 'outbound';
  status: string;
  subject: string | null;
  from_email: string | null;
  to_email: string | null;
  created_at: string;
};

type AutomationMetrics = {
  activeAgents: number;
  totalTasks: number;
  outbound: number;
  inbound: number;
  avgSuccess: number;
};

function formatRelativeTime(isoString: string) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString('en-IN');
}

function getLogTone(status: string) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'success' || normalized === 'accepted' || normalized === 'sent') {
    return 'bg-emerald-500/10 text-emerald-300';
  }

  if (normalized === 'pending' || normalized === 'queued' || normalized === 'opened') {
    return 'bg-amber-500/10 text-amber-300';
  }

  return 'bg-rose-500/10 text-rose-300';
}

export default function BusinessAutomationsPage() {
  const portal = useCompanyPortalState();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [emails, setEmails] = useState<AgentEmail[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics>({
    activeAgents: 0,
    totalTasks: 0,
    outbound: 0,
    inbound: 0,
    avgSuccess: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copyLabel, setCopyLabel] = useState('Copy automation summary');

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!portal.hasPaidAccess) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setLoading(true);
        }

        const response = await fetch('/api/business/automations', { cache: 'no-store' });
        const payload = await response.json();

        if (!active) {
          return;
        }

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Unable to load business automations');
        }

        setMetrics((payload?.data?.metrics ?? {
          activeAgents: 0,
          totalTasks: 0,
          outbound: 0,
          inbound: 0,
          avgSuccess: 0,
        }) as AutomationMetrics);
        setAgents((payload?.data?.agents ?? []) as AgentData[]);
        setSchedules((payload?.data?.schedules ?? []) as Schedule[]);
        setLogs((payload?.data?.logs ?? []) as AgentLog[]);
        setEmails((payload?.data?.emails ?? []) as AgentEmail[]);
      } catch (error) {
        console.error('Failed to load business automations:', error);
        if (active) {
          setMetrics({
            activeAgents: 0,
            totalTasks: 0,
            outbound: 0,
            inbound: 0,
            avgSuccess: 0,
          });
          setAgents([]);
          setSchedules([]);
          setLogs([]);
          setEmails([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (!portal.loading) {
      load();
    }

    const interval = window.setInterval(() => {
      // Skip the refetch while the tab is backgrounded — no one's watching,
      // and it was firing every 30s indefinitely regardless.
      if (!portal.loading && portal.hasPaidAccess && document.visibilityState === 'visible') {
        load();
      }
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [portal.hasPaidAccess, portal.loading]);

  const visibleAgents = useMemo(
    () => [...agents].sort((left, right) => right.tasks_last_24h - left.tasks_last_24h).slice(0, 8),
    [agents]
  );

  const recentSchedules = useMemo(() => schedules.slice(0, 6), [schedules]);
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs]);
  const recentEmails = useMemo(() => emails.slice(0, 6), [emails]);

  const handleCopySummary = async () => {
    const summary = [
      `Workspace: ${portal.companyName}`,
      `Plan: ${portal.planName ?? 'Active subscription'}`,
      `Active agents: ${metrics.activeAgents}`,
      `Tasks in last 24h: ${metrics.totalTasks}`,
      `Average success: ${metrics.avgSuccess}%`,
      `Outbound email activity: ${metrics.outbound}`,
      `Inbound email activity: ${metrics.inbound}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopyLabel('Summary copied');
      window.setTimeout(() => setCopyLabel('Copy automation summary'), 1800);
    } catch (error) {
      console.error('Failed to copy automation summary:', error);
      setCopyLabel('Copy failed');
      window.setTimeout(() => setCopyLabel('Copy automation summary'), 1800);
    }
  };

  if (portal.loading) {
    return <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">Loading automations...</div>;
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
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#e5c487]">
              Automation network
            </div>
            <h1 className="mt-4 text-3xl font-bold font-heading">Automation Hub</h1>
            <p className="mt-2 max-w-3xl text-[var(--muted)]">
              Live agent activity, schedules, and message volume connected to your workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[#c8a96e]/40 hover:text-[#e5c487]"
          >
            <Copy className="h-4 w-4" />
            {copyLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active agents', value: metrics.activeAgents, icon: Bot },
          { label: 'Tasks in last 24h', value: metrics.totalTasks, icon: Activity },
          { label: 'Outbound messages', value: metrics.outbound, icon: Send },
          { label: 'Average success', value: `${metrics.avgSuccess}%`, icon: Workflow },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              <card.icon className="h-4 w-4 text-[#e5c487]" />
              {card.label}
            </div>
            <div className="mt-4 text-3xl font-semibold text-[var(--foreground)]">{loading ? '-' : card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <Bot className="h-5 w-5 text-[#e5c487]" />
            Automation roster
          </div>
          <div className="mt-5 space-y-3">
            {visibleAgents.length > 0 ? (
              visibleAgents.map((agent) => {
                const nextRun = recentSchedules.find((schedule) => schedule.agent === agent.agent_name);

                return (
                  <div key={agent.agent_name} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-[var(--foreground)]">{agent.label ?? agent.agent_name.replace(/_/g, ' ')}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {agent.schedule ?? 'Scheduled automation'} {nextRun ? `• ${nextRun.next_run}` : ''}
                        </div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${agent.is_suspended ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        {agent.is_suspended ? 'Attention' : 'Active'}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Success rate</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{Math.round(agent.success_rate)}%</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Tasks</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{agent.tasks_last_24h} in 24h</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Last activity</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                          {agent.last_log?.created_at ? formatRelativeTime(agent.last_log.created_at) : 'No recent activity'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 p-5 text-sm text-[var(--muted)]">
                Automation roster details will appear here as activity is detected.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <Clock3 className="h-5 w-5 text-[#e5c487]" />
              Upcoming schedule
            </div>
            <div className="mt-5 space-y-3">
              {recentSchedules.length > 0 ? (
                recentSchedules.map((schedule) => (
                  <div key={`${schedule.agent}-${schedule.schedule}`} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 px-4 py-3">
                    <div className="font-medium text-[var(--foreground)]">{schedule.agent.replace(/_/g, ' ')}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{schedule.schedule}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[#e5c487]">{schedule.next_run ?? 'Live schedule'}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 p-4 text-sm text-[var(--muted)]">
                  Schedule timing will appear here once automation data is available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <Mail className="h-5 w-5 text-[#e5c487]" />
              Recent message activity
            </div>
            <div className="mt-5 space-y-3">
              {recentEmails.length > 0 ? (
                recentEmails.map((email) => (
                  <div key={email.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--foreground)]">{email.subject || '(no subject)'}</div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getLogTone(email.status)}`}>
                        {email.direction}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-[var(--muted)]">{email.agent_name.replace(/_/g, ' ')}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{formatRelativeTime(email.created_at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 p-4 text-sm text-[var(--muted)]">
                  Email activity will appear here as automations send and receive messages.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <Activity className="h-5 w-5 text-[#e5c487]" />
          Recent automation log
        </div>
        <div className="mt-5 space-y-3">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <div key={`${log.agent_name}-${log.created_at}-${log.action}`} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium text-[var(--foreground)]">{log.agent_name.replace(/_/g, ' ')}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{log.action.replace(/_/g, ' ')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getLogTone(log.status)}`}>
                    {log.status}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{formatRelativeTime(log.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 p-4 text-sm text-[var(--muted)]">
              Recent automation runs will appear here once the network starts processing activity.
            </div>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
