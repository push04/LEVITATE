'use client';

import {
  BarChart3,
  Bot,
  ClipboardList,
  FileSearch,
  Files,
  Gavel,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import { useBusinessResearchQuota } from '@/hooks/useBusinessResearchQuota';
import { NavItem, StatusBadge } from '@/components/business/ui';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import type { PortalFeatureKey } from '@/lib/business-intelligence';

type SidebarItem = {
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  href: string;
  feature?: PortalFeatureKey;
  paidOnly?: boolean;
  quotaBadge?: boolean;
};

const MENU_ITEMS: SidebarItem[] = [
  { label: 'Overview', icon: LayoutDashboard, href: '/business/dashboard' },
  { label: 'CRM', icon: BarChart3, href: '/business/dashboard/crm', feature: 'crm', paidOnly: true },
  { label: 'Leads', icon: ClipboardList, href: '/business/dashboard/leads', feature: 'leads', paidOnly: true },
  { label: 'Automations', icon: Bot, href: '/business/dashboard/automations', feature: 'automations', paidOnly: true },
  { label: 'Mailbox', icon: Mail, href: '/business/dashboard/mailbox', feature: 'mailbox', paidOnly: true },
  { label: 'Market Research', icon: FileSearch, href: '/business/dashboard/market-research', feature: 'marketResearch', paidOnly: true, quotaBadge: true },
  { label: 'Legal Tools', icon: Gavel, href: '/business/dashboard/legal-tools', feature: 'legalTools', paidOnly: true },
  { label: 'Report History', icon: Files, href: '/business/dashboard/reports', feature: 'reportHistory', paidOnly: true },
  { label: 'Profile Settings', icon: Settings, href: '/business/dashboard/settings', feature: 'profileSettings', paidOnly: true },
];

export default function BusinessSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const portal = useCompanyPortalState();
  const researchQuota = useBusinessResearchQuota(Boolean(portal.hasPaidAccess) && portal.featureAccess.marketResearch);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      window.location.href = '/business/login';
    }
  };

  if (portal.loading) {
    return <div className={`h-full w-full ${styles.sidebar}`} />;
  }

  return (
    <div className={`${styles.sidebar} relative flex h-full min-h-screen w-full flex-col border-r border-[var(--border-subtle)]`}>
      <div className="relative z-10 border-b border-[var(--border-subtle)] px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="font-serif-display text-[18px] text-[var(--gold-base)]">Levitate</span>
          <span className="text-[18px] font-light text-[var(--text-secondary)]">OS</span>
        </div>
        <div className="mt-1 type-caption uppercase tracking-[1.5px]">Business Operations Portal</div>

        <div className="mt-5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-4 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-focus)] hover:bg-[var(--bg-elevated)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate type-heading text-[var(--text-primary)]">{portal.companyName}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge variant="gold">{portal.planName ?? 'Subscription setup'}</StatusBadge>
                {portal.subscriptionStatus === 'active' ? (
                  <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] text-[var(--status-closed)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--status-closed)] animate-levitate-pulse" />
                    Active
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {portal.workspaceUrl ? (
            <div className="mt-3">
              <div className="type-caption">Business backlink</div>
              <a
                href={portal.workspaceUrl}
                target="_blank"
                rel="noreferrer"
                title={portal.workspaceUrl}
                className="mt-1 block truncate type-mono text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {portal.workspaceUrl}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="relative z-10 flex-1 space-y-1 px-3 py-5">
        {MENU_ITEMS.filter((item) => {
          if (!item.feature) {
            return true;
          }

          if (!portal.hasPaidAccess) {
            return true;
          }

          return portal.featureAccess[item.feature];
        }).map((item) => {
          const itemLocked = item.paidOnly && !portal.hasPaidAccess;
          const targetHref = itemLocked ? '/business/dashboard/subscribe' : item.href;
          const isActive = itemLocked
            ? pathname === '/business/dashboard/subscribe'
            : item.href === '/business/dashboard'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const remainingQuota =
            item.quotaBadge && portal.hasPaidAccess && !researchQuota.loading ? researchQuota.remaining : null;

          return (
            <NavItem
              key={item.href}
              href={targetHref}
              label={item.label}
              icon={item.icon}
              active={isActive}
              onClick={onNavigate}
              notificationCount={typeof remainingQuota === 'number' ? remainingQuota : null}
            />
          );
        })}
      </nav>

      {!portal.hasPaidAccess ? (
        <div className="relative z-10 px-4 pb-4">
          <Link
            href="/business/dashboard/subscribe"
            onClick={onNavigate}
            className="block rounded-[14px] border border-[var(--border-default)] bg-[var(--gold-glow)] px-4 py-4 shadow-[var(--shadow-md)] transition-transform hover:-translate-y-[1px]"
          >
            <div className="type-subheading text-[var(--gold-bright)]">Review Plans</div>
            <div className="mt-2 type-body text-[var(--text-primary)]">Activate the full business operating system.</div>
          </Link>
        </div>
      ) : null}

      <div className="relative z-10 border-t border-[var(--border-subtle)] p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-[10px] px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[rgba(201,165,90,0.05)] hover:text-[var(--text-primary)]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
