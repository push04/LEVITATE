'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bot,
  ClipboardList,
  Copy,
  Mail,
  Gift,
  LinkIcon,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import { useTrialGate } from '@/hooks/useTrialGate';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { type BusinessLeadRecord, useBusinessLeadRecords } from '@/hooks/useBusinessLeadRecords';
import { GoldButton, SkeletonBlock, StatCard, StatusBadge, Toast } from '@/components/business/ui';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import { generateReferralCode, copyToClipboard } from '@/lib/referral';
import { supabase } from '@/lib/supabase';

type BusinessDashboardClientProps = {
  onboardingSuccess: boolean;
};

const moduleCards = [
  {
    title: 'CRM Pipeline',
    body: 'Track live pipeline totals, stage movement, and conversion momentum across your business operations.',
    href: '/business/dashboard/crm',
    icon: BarChart3,
  },
  {
    title: 'Leads',
    body: 'Search, copy, qualify, and operationalize lead records with cleaner context and decision support.',
    href: '/business/dashboard/leads',
    icon: ClipboardList,
  },
  {
    title: 'Automation Hub',
    body: 'Review agent activity, task throughput, and communication volume with live signals instead of static blocks.',
    href: '/business/dashboard/automations',
    icon: Bot,
  },
  {
    title: 'Mailbox',
    body: 'See outreach and reply flows in one place with calmer density and stronger message-state visibility.',
    href: '/business/dashboard/mailbox',
    icon: Mail,
  },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function getLeadVariant(status: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'closed') return 'closed' as const;
  if (normalized === 'contacted' || normalized === 'follow up' || normalized === 'in progress') return 'progress' as const;
  return 'new' as const;
}

function getLeadSubtitle(record: BusinessLeadRecord) {
  const parts = [record.city, record.service_category, record.business_type].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : 'Pipeline record';
}

function buildTrend(value: number) {
  const base = Math.max(value, 1);
  return [35, 48, 42, 56, 51, 68, 63, 80].map((step, index) => Math.min(100, Math.round((step + base * 2 + index * 3) % 100) || 24));
}

export default function BusinessDashboardClient({ onboardingSuccess }: BusinessDashboardClientProps) {
  const portal = useCompanyPortalState();
  const { records, loading, stats } = useBusinessLeadRecords(Boolean(portal.hasPaidAccess) && !portal.loading);
  const [toastMessage, setToastMessage] = useState('');
  const { isTrial } = useTrialGate();
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralStats, setReferralStats] = useState({ sent: 0, converted: 0, rewards: 0 });
  const [referralLoading, setReferralLoading] = useState(true);

  useEffect(() => {
    if (!portal.companyId || isTrial) return;

    const loadReferralData = async () => {
      try {
        const { data: referral } = await supabase
          .from('referrals')
          .select('referral_code')
          .eq('referrer_id', portal.userId!)
          .single();

        if (referral?.referral_code) {
          setReferralCode(referral.referral_code);
        } else {
          const newCode = generateReferralCode();
          const { error } = await supabase.from('referrals').insert({
            referrer_id: portal.userId!,
            referral_code: newCode,
            status: 'pending',
          });
          if (!error) setReferralCode(newCode);
        }

        const { data: rewards } = await supabase
          .from('referral_rewards')
          .select('status')
          .eq('user_id', portal.userId!);

        const { data: referrals } = await supabase
          .from('referrals')
          .select('status')
          .eq('referrer_id', portal.userId!);

        setReferralStats({
          sent: referrals?.length || 0,
          converted: referrals?.filter((r: any) => r.status === 'completed').length || 0,
          rewards: rewards?.filter((r: any) => r.status === 'paid').length || 0,
        });
      } catch (error) {
        console.error('Failed to load referral data:', error);
      } finally {
        setReferralLoading(false);
      }
    };

    loadReferralData();
  }, [portal.companyId, portal.userId, isTrial]);

  const referralLink = referralCode ? `${window.location.origin}/r/${referralCode}` : '';

  const latestRecords = useMemo(() => records.slice(0, 5), [records]);

  const handleCopySummary = async () => {
    const lines = [
      `Workspace: ${portal.companyName}`,
      `Plan: ${portal.planName ?? 'Active subscription'}`,
      `Billing: ${portal.billingCycle ?? 'Custom'}`,
      `Status: ${portal.subscriptionStatus}`,
        `Business backlink: ${portal.workspaceUrl ?? 'Pending assignment'}`,
      `Total leads: ${stats.total}`,
      `New: ${stats.newCount}`,
      `In progress: ${stats.engaged}`,
      `Closed: ${stats.closed}`,
      `Pipeline value: ${formatCurrency(stats.totalValue)}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setToastMessage('Overview copied to clipboard');
      window.setTimeout(() => setToastMessage(''), 2500);
    } catch (error) {
      console.error('Failed to copy business overview:', error);
      setToastMessage('Copy failed');
      window.setTimeout(() => setToastMessage(''), 2500);
    }
  };

  if (portal.loading) {
    return (
      <div className="space-y-6">
        <section className={`premium-noise-panel ${styles.panel} p-6 md:p-8`}>
          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-44" rounded="rounded-full" />
            <SkeletonBlock className="h-10 w-[min(520px,90%)]" />
            <SkeletonBlock className="h-4 w-[min(640px,92%)]" />
            <SkeletonBlock className="h-4 w-[min(520px,85%)]" />
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
    <div className="space-y-7">
      <Toast visible={Boolean(toastMessage)} message={toastMessage} />

      {onboardingSuccess ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[14px] border border-[rgba(61,122,92,0.3)] bg-[rgba(61,122,92,0.12)] px-5 py-4 text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
        >
          Subscription confirmed. Your business workspace is active and ready for operational use.
        </motion.div>
      ) : null}

      <section className={`premium-noise-panel ${styles.panel} p-6 md:p-8`}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="type-hero text-[var(--text-primary)]">{portal.companyName}</h1>
              <StatusBadge variant="gold">{portal.planName ?? 'Business workspace'}</StatusBadge>
            </div>
            <p className="mt-4 max-w-3xl type-body text-[var(--text-secondary)]">
              A warm-dark operating layer for Indian business teams to monitor pipeline health, execution momentum, and customer-facing activity from a single workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/business/dashboard/leads"
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:translate-y-[-1px] hover:brightness-105"
            >
              <span>Open Leads</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <GoldButton variant="ghost" iconLeft={<Copy className="h-4 w-4" />} onClick={handleCopySummary}>
              Copy overview
            </GoldButton>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Plan', value: portal.planName ?? 'Active subscription' },
            { label: 'Billing', value: portal.billingCycle ? `${portal.billingCycle[0].toUpperCase()}${portal.billingCycle.slice(1)}` : 'Custom' },
            { label: 'Status', value: portal.subscriptionStatus === 'active' ? 'Active' : portal.subscriptionStatus || 'Active' },
            { label: 'Business backlink', value: portal.workspaceUrl ?? 'Pending assignment' },
          ].map((item) => (
            <div key={item.label} className={`premium-noise-panel ${styles.panel} p-5`}>
              <div className="type-subheading text-[var(--text-tertiary)]">{item.label}</div>
              <div className={`mt-3 ${item.label === 'Business backlink' ? 'type-mono text-[var(--text-accent)]' : 'type-heading text-[var(--text-primary)]'} truncate`}>
                {item.label === 'Status' && item.value === 'Active' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[var(--status-closed)] animate-levitate-pulse" />
                    {item.value}
                  </span>
                ) : (
                  item.value
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Leads" value={stats.total} tone="gold" trend={buildTrend(stats.total)} />
        <StatCard label="New" value={stats.newCount} tone="new" trend={buildTrend(stats.newCount)} />
        <StatCard label="In Progress" value={stats.engaged} tone="progress" trend={buildTrend(stats.engaged)} />
        <StatCard label="Closed" value={stats.closed} tone="closed" trend={buildTrend(stats.closed)} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {moduleCards.map((tool, index) => (
          <motion.div
            key={tool.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
            className={`${styles.panel} ${styles.panelHover} group flex min-h-[160px] flex-col p-6`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--gold-base)]">
              <tool.icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div className="mt-5 type-heading text-[var(--text-primary)]">{tool.title}</div>
            <p className="mt-3 flex-1 type-body text-[var(--text-secondary)]">{tool.body}</p>
            <Link
              href={tool.href}
              className="mt-6 inline-flex items-center justify-between text-sm font-medium text-[var(--text-accent)]"
            >
              <span>Open module</span>
              <ArrowRight className="h-4 w-4 translate-x-[-6px] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          </motion.div>
        ))}
      </section>

      {!isTrial && (
        <section className={`premium-noise-panel ${styles.panel} p-6 md:p-8`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--gold-base)]">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <div className="type-heading text-[var(--text-primary)]">Refer & Earn</div>
                <p className="mt-1 type-body text-[var(--text-secondary)]">
                  Invite friends and earn rewards when they start their trial.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-2">
                <LinkIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="type-mono text-sm text-[var(--text-accent)] truncate max-w-[200px]">
                  {referralLoading ? 'Loading...' : referralLink}
                </span>
              </div>
              <GoldButton
                variant="ghost"
                iconLeft={<Copy className="h-4 w-4" />}
                onClick={() => copyToClipboard(referralLink, setToastMessage)}
                disabled={referralLoading || !referralLink}
              >
                Copy link
              </GoldButton>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className={`${styles.panel} p-5 text-center`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Referrals Sent</div>
              <div className="mt-3 type-stat text-[var(--text-primary)]">{referralStats.sent}</div>
            </div>
            <div className={`${styles.panel} p-5 text-center`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Converted</div>
              <div className="mt-3 type-stat text-[var(--text-primary)] flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-[var(--status-closed)]" />
                {referralStats.converted}
              </div>
            </div>
            <div className={`${styles.panel} p-5 text-center`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Rewards Earned</div>
              <div className="mt-3 type-stat text-[var(--gold-base)]">{referralStats.rewards}</div>
            </div>
          </div>
        </section>
      )}

      <section className={`${styles.panel} overflow-hidden`}>
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <div className="type-heading text-[var(--text-primary)]">Latest pipeline activity</div>
            <p className="mt-1 type-body text-[var(--text-secondary)]">Recent records connected to your workspace.</p>
          </div>
          <Link href="/business/dashboard/leads" className="type-label text-[var(--text-accent)] hover:text-[var(--gold-bright)]">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-[var(--text-secondary)]">Loading records...</div>
        ) : latestRecords.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {latestRecords.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.28 }}
                className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <StatusBadge variant={getLeadVariant(record.status)}>{record.status ?? 'New'}</StatusBadge>
                  <div className="mt-3 type-heading text-[var(--text-primary)]">{record.name}</div>
                  <div className="mt-2 type-label text-[var(--text-secondary)]">
                    {new Date(record.created_at).toLocaleDateString('en-IN')} • {getLeadSubtitle(record)}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <div className="type-stat-sm text-[var(--text-primary)]">{formatCurrency(record.deal_value ?? 0)}</div>
                  <div className="mt-2">
                    <Link href="/business/dashboard/leads" className="type-label text-[var(--text-accent)] hover:text-[var(--gold-bright)]">
                      Open record
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <h3 className="type-title text-[var(--text-primary)]">Pipeline activity will appear here soon</h3>
            <p className="mt-3 type-body text-[var(--text-secondary)]">
              As soon as new records are added to the lead pipeline, they will surface here automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
