'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Database,
  Mail,
  MessageSquare,
  Settings,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type CompanyDashboardClientProps = {
  onboardingSuccess: boolean;
};

type CompanyProfile = {
  name: string;
};

const toolCards = [
  {
    title: 'CRM Pipeline',
    body: 'Track leads, lifecycle stages, and conversion activity for your company workspace.',
    href: '/company/dashboard/crm',
    icon: Database,
  },
  {
    title: 'Automation Hub',
    body: 'Configure automation products and rollout scope for WhatsApp, email, Meta, and LinkedIn.',
    href: '/company/dashboard/automations',
    icon: Bot,
  },
  {
    title: 'Growth Analytics',
    body: 'Monitor growth execution metrics, channel rollout, and pipeline velocity.',
    href: '/company/dashboard/growth',
    icon: TrendingUp,
  },
  {
    title: 'Mailbox',
    body: 'Review communication operations and mailbox workflow readiness.',
    href: '/company/dashboard/mailbox',
    icon: Mail,
  },
  {
    title: 'Business Workspace',
    body: 'Open the separate business portal where client-facing delivery happens after activation.',
    href: '/business/dashboard',
    icon: MessageSquare,
  },
  {
    title: 'Workspace Control',
    body: 'Adjust settings, teams, and operational controls.',
    href: '/company/dashboard/settings',
    icon: Settings,
  },
] as const;

export default function CompanyDashboardClient({ onboardingSuccess }: CompanyDashboardClientProps) {
  const [companyName, setCompanyName] = useState('Company Operations');

  useEffect(() => {
    const loadCompanyName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('owner_id', user.id)
        .maybeSingle<CompanyProfile>();

      if (company?.name) {
        setCompanyName(company.name);
      }
    };

    loadCompanyName();
  }, []);

  const quickStats = useMemo(
    () => [
      { label: 'CRM', value: 'Ready' },
      { label: 'Automations', value: 'Ready' },
      { label: 'Growth', value: 'Ready' },
      { label: 'Mailbox', value: 'Ready' },
    ],
    []
  );

  return (
    <div className="space-y-8">
      {onboardingSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-emerald-100"
        >
          Payment confirmed and business workspace activated. Company tools remain available here in the separate operations portal.
        </motion.div>
      )}

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <h1 className="text-3xl font-bold font-heading">Company Dashboard</h1>
        <p className="mt-2 text-[var(--muted)]">
          {companyName} | Internal operations access for CRM, automations, mailbox, and growth systems.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{item.label}</div>
            <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{item.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {toolCards.map((tool, index) => (
          <motion.div
            key={tool.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
              <tool.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{tool.title}</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{tool.body}</p>
            <Link
              href={tool.href}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Open tool
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
