'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';

type BusinessPortalLockedProps = {
  companyName?: string;
  subscriptionStatus?: string;
  planName?: string | null;
  billingCycle?: string | null;
  subdomainUrl?: string | null;
  title?: string;
  description?: string;
};

type Lane = {
  title: string;
  body: string;
  icon: ComponentType<{ className?: string }>;
};

function PipelineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pipeline-g" x1="8" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3ddb2" />
          <stop offset="1" stopColor="#c8a96e" />
        </linearGradient>
      </defs>
      <rect x="10" y="12" width="12" height="12" rx="3" fill="none" stroke="url(#pipeline-g)" strokeWidth="2" />
      <rect x="34" y="12" width="12" height="12" rx="3" fill="none" stroke="url(#pipeline-g)" strokeWidth="2" />
      <rect x="22" y="32" width="12" height="12" rx="3" fill="none" stroke="url(#pipeline-g)" strokeWidth="2" />
      <path d="M22 18h12M28 24v8" stroke="url(#pipeline-g)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AutomationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="auto-g" x1="8" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3ddb2" />
          <stop offset="1" stopColor="#c8a96e" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="16" fill="none" stroke="url(#auto-g)" strokeWidth="2" />
      <circle cx="28" cy="28" r="4" fill="none" stroke="url(#auto-g)" strokeWidth="2" />
      <path d="M28 12v5M28 39v5M12 28h5M39 28h5M17 17l4 4M35 35l4 4M39 17l-4 4M17 39l4-4" stroke="url(#auto-g)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ReachIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="reach-g" x1="8" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3ddb2" />
          <stop offset="1" stopColor="#c8a96e" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="4" fill="url(#reach-g)" />
      <circle cx="28" cy="28" r="12" fill="none" stroke="url(#reach-g)" strokeWidth="2" />
      <circle cx="28" cy="28" r="20" fill="none" stroke="url(#reach-g)" strokeWidth="2" opacity="0.6" />
      <path d="M28 8v8M28 40v8M8 28h8M40 28h8" stroke="url(#reach-g)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vault-g" x1="8" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3ddb2" />
          <stop offset="1" stopColor="#c8a96e" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="36" height="36" rx="6" fill="none" stroke="url(#vault-g)" strokeWidth="2" />
      <circle cx="28" cy="28" r="8" fill="none" stroke="url(#vault-g)" strokeWidth="2" />
      <path d="M28 20v8l5 3" stroke="url(#vault-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const growthLanes: Lane[] = [
  {
    title: 'Pipeline OS',
    body: 'Track lead flow, momentum, and handoff activity from one central workspace.',
    icon: PipelineIcon,
  },
  {
    title: 'Automation Engine',
    body: 'Monitor WhatsApp, email, Meta, and LinkedIn activity connected to your subscribed plan.',
    icon: AutomationIcon,
  },
  {
    title: 'Lead Review',
    body: 'Open business records, inspect details, and export the information your team needs.',
    icon: ReachIcon,
  },
  {
    title: 'Mailbox View',
    body: 'Keep conversation history, delivery status, and outreach context in one place.',
    icon: VaultIcon,
  },
];

export default function BusinessPortalLocked({
  companyName,
  subscriptionStatus = 'none',
  planName,
  billingCycle,
  subdomainUrl,
  title,
  description,
}: BusinessPortalLockedProps) {
  const isPending = subscriptionStatus === 'pending';

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.12)] md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,169,110,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(200,169,110,0.08),transparent_30%)]" />

      <div className="relative space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e5c487]">
              {isPending ? 'Subscription in progress' : 'Subscription setup'}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                {title ?? 'Complete your business workspace activation'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">
                {description ??
                  'Choose a plan from this dashboard to connect CRM, automations, leads, and mailbox in one professional workspace.'}
              </p>
            </div>
          </div>

          <div className="min-w-[260px] rounded-[24px] border border-[var(--border)] bg-[var(--background)]/85 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Workspace status</div>
            <div className="mt-3 text-xl font-semibold text-[var(--foreground)]">{companyName || 'Business workspace'}</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              {isPending
                ? 'We found an active subscription in progress. Complete payment and the workspace will update automatically.'
                : 'Choose a plan to activate this account and connect the full business workspace.'}
            </div>
            <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <div className="flex items-center justify-between gap-4">
                <span>Plan</span>
                <span className="font-medium text-[var(--foreground)]">{planName || 'Choose a plan'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Billing</span>
                <span className="font-medium capitalize text-[var(--foreground)]">{billingCycle || 'Custom'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                    <span>Business backlink</span>
                <span className="max-w-[150px] truncate font-medium text-[var(--foreground)]">{subdomainUrl || 'Assigned after activation'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {growthLanes.map((lane) => (
            <div key={lane.title} className="rounded-[24px] border border-[var(--border)] bg-[var(--background)]/75 p-5 backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c8a96e]/10 text-[#e5c487]">
                <lane.icon className="h-7 w-7" />
              </div>
              <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">{lane.title}</div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{lane.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-[28px] border border-[#c8a96e]/20 bg-[#c8a96e]/8 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-[var(--foreground)]">Open subscription to activate your business workspace.</div>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Once payment is confirmed, CRM, leads, automation reporting, and mailbox activity become available here automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/business/dashboard/subscribe"
              className="inline-flex items-center justify-center rounded-2xl bg-[#c8a96e] px-5 py-3 text-sm font-semibold text-[#140f07] transition-transform hover:-translate-y-0.5"
            >
              Open subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
