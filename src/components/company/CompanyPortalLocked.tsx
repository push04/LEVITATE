'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Globe, Lock, Megaphone, MessageSquare, Sparkles } from 'lucide-react';

type CompanyPortalLockedProps = {
  companyName?: string;
  subscriptionStatus?: string;
  planName?: string | null;
  billingCycle?: string | null;
  subdomainUrl?: string | null;
  title?: string;
  description?: string;
};

const growthLanes = [
  {
    title: 'Lead capture + CRM',
    body: 'Route inbound demand into one business dashboard instead of juggling forms, chats, and spreadsheets.',
    icon: BarChart3,
  },
  {
    title: 'WhatsApp + email flows',
    body: 'Automate follow-up, reminders, nurture, and handoff so leads do not cool off between touchpoints.',
    icon: MessageSquare,
  },
  {
    title: 'Meta + LinkedIn growth ops',
    body: 'Plug paid social, outreach, reporting, and retargeting into one operating layer when your rollout includes them.',
    icon: Megaphone,
  },
  {
    title: 'Branded portal + reporting',
    body: 'Give your team one place to track projects, files, rollout progress, and what Levitate is shipping next.',
    icon: Globe,
  },
];

export default function CompanyPortalLocked({
  companyName,
  subscriptionStatus = 'none',
  planName,
  billingCycle,
  subdomainUrl,
  title,
  description,
}: CompanyPortalLockedProps) {
  const isPending = subscriptionStatus === 'pending';

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)] md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,169,110,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.12),transparent_24%)]" />

      <div className="relative space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8a96e]">
              <Lock className="h-3.5 w-3.5" />
              {isPending ? 'Payment pending' : 'Portal locked'}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                {title ?? 'Unlock LevitateOS for your business'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">
                {description ?? 'This portal opens after your LevitateOS subscription is active. Until then, we keep the workspace locked and show exactly how the rollout helps you capture leads, automate follow-up, and grow faster.'}
              </p>
            </div>
          </div>

          <div className="min-w-[260px] rounded-[24px] border border-[var(--border)] bg-[var(--background)]/85 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Workspace status</div>
            <div className="mt-3 text-xl font-semibold text-[var(--foreground)]">{companyName || 'Your company portal'}</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              {isPending
                ? 'We can see a pending onboarding record. Finish activation and the portal opens automatically.'
                : 'No active subscription is attached to this business account yet.'}
            </div>
            <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <div className="flex items-center justify-between gap-4">
                <span>Plan</span>
                <span className="font-medium text-[var(--foreground)]">{planName || 'Not selected yet'}</span>
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
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c8a96e]/12 text-[#c8a96e]">
                <lane.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">{lane.title}</div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{lane.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-[28px] border border-[#c8a96e]/20 bg-[#c8a96e]/8 p-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Sparkles className="h-4 w-4 text-[#c8a96e]" />
              What activates after payment
            </div>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Levitate turns on your branded dashboard, delivery views, CRM structure, and the automation base for WhatsApp, email, Meta, and LinkedIn according to your chosen rollout.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/onboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#c8a96e] px-5 py-3 text-sm font-semibold text-[#140f07] transition-transform hover:-translate-y-0.5"
            >
              Go to Onboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[#c8a96e]/35 hover:text-[#c8a96e]"
            >
              Contact Levitate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

