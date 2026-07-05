'use client';

import {
  BarChart3, Bot, ClipboardList, FileSearch,
  Files, Gavel, Key, LayoutDashboard, Landmark, LogOut,
  Mail, MessageCircle, Settings, Plug, ShoppingBag, Sparkles, BrainCircuit, BookOpen, LineChart,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import { useBusinessResearchQuota } from '@/hooks/useBusinessResearchQuota';
import type { PortalFeatureKey } from '@/lib/business-intelligence';

type SidebarItem = {
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  href: string;
  feature?: PortalFeatureKey;
  paidOnly?: boolean;
  quotaBadge?: boolean;
};

const MENU: SidebarItem[] = [
  { label: 'Overview',    icon: LayoutDashboard, href: '/business/dashboard' },
  { label: 'CRM',         icon: BarChart3,        href: '/business/dashboard/crm',             feature: 'crm',            paidOnly: true },
  { label: 'Leads',       icon: ClipboardList,    href: '/business/dashboard/leads',           feature: 'leads',          paidOnly: true },
  { label: 'Automations', icon: Bot,              href: '/business/dashboard/automations',     feature: 'automations',    paidOnly: true },
  { label: 'Mailbox',     icon: Mail,             href: '/business/dashboard/mailbox',         feature: 'mailbox',        paidOnly: true },
  { label: 'WhatsApp',   icon: MessageCircle,    href: '/business/dashboard/whatsapp',        feature: 'whatsapp',       paidOnly: true },
  { label: 'Research',    icon: FileSearch,       href: '/business/dashboard/market-research', feature: 'marketResearch', paidOnly: true, quotaBadge: true },
  { label: 'Legal Tools', icon: Gavel,            href: '/business/dashboard/legal-tools',     feature: 'legalTools',     paidOnly: true },
  { label: 'Tenders',     icon: Landmark,         href: '/business/dashboard/tenders',         feature: 'tenders',        paidOnly: true },
  { label: 'Marketplace', icon: ShoppingBag,      href: '/business/dashboard/marketplace',     feature: 'marketplace',    paidOnly: true },
  { label: 'Market Pulse',icon: LineChart,        href: '/business/dashboard/market-pulse',    feature: 'marketPulse',    paidOnly: true },
  { label: 'Reports',     icon: Files,            href: '/business/dashboard/reports',         feature: 'reportHistory',  paidOnly: true },
  { label: 'Integrations',icon: Plug,             href: '/business/dashboard/integrations',    feature: 'leads',          paidOnly: true },
  { label: 'AI Analyze', icon: Sparkles,         href: '/business/dashboard/analyze',         feature: 'leads',          paidOnly: true },
  { label: 'AI Assistant',icon: BrainCircuit,    href: '/business/dashboard/chat',            feature: 'leads',          paidOnly: true },
  { label: 'API Keys',    icon: Key,              href: '/business/dashboard/api-keys',        feature: 'profileSettings',paidOnly: true },
  { label: 'Settings',    icon: Settings,         href: '/business/dashboard/settings',        feature: 'profileSettings',paidOnly: true },
  { label: 'Help & Guides',icon: BookOpen,        href: '/business/dashboard/help' },
];

export default function BusinessSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const portal = useCompanyPortalState();
  const researchQuota = useBusinessResearchQuota(Boolean(portal.hasPaidAccess) && portal.featureAccess.marketResearch);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    window.location.href = '/business/login';
  };

  if (portal.loading) {
    return (
      <div className="flex h-full min-h-screen w-full flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5 space-y-3">
          <div className="h-5 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
        </div>
        <div className="flex-1 p-3 space-y-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const subBadge: Record<string, string> = {
    active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    trialing: 'bg-amber-50 text-amber-700 border-amber-200',
    past_due: 'bg-red-50 text-red-700 border-red-200',
  };
  const subColor = subBadge[portal.subscriptionStatus ?? ''] ?? 'bg-gray-50 text-gray-500 border-gray-200';

  return (
    <div className="flex h-full min-h-screen w-full flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-bold text-gray-900">Levitate</span>
          <span className="text-[17px] font-light text-gray-400">OS</span>
        </div>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Business Portal</p>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="truncate text-[13px] font-semibold text-gray-900">{portal.companyName ?? 'Your company'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#f5ede0] px-2 py-0.5 text-[10px] font-semibold text-[#8a6d3f]">
              {portal.planName ?? 'Free'}
            </span>
            {portal.subscriptionStatus && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${subColor}`}>
                {portal.subscriptionStatus}
              </span>
            )}
          </div>
          {portal.workspaceUrl && (
            <a href={portal.workspaceUrl} target="_blank" rel="noreferrer"
              className="mt-2 block truncate text-[10px] text-gray-400 hover:text-gray-700 transition-colors">
              {portal.workspaceUrl}
            </a>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {MENU.filter(item => {
          if (!item.feature) return true;
          if (!portal.hasPaidAccess) return true;
          return portal.featureAccess[item.feature];
        }).map(item => {
          const locked = Boolean(item.paidOnly && !portal.hasPaidAccess);
          const target = locked ? '/business/dashboard/subscribe' : item.href;
          const active = locked
            ? pathname === '/business/dashboard/subscribe'
            : item.href === '/business/dashboard'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
          const quota = item.quotaBadge && portal.hasPaidAccess && !researchQuota.loading
            ? researchQuota.remaining : null;

          return (
            <Link key={item.href} href={target} onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'bg-[#f5ede0] text-[#7a5f2a]'
                  : locked
                    ? 'text-gray-300'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon
                className={`h-[15px] w-[15px] shrink-0 ${active ? 'text-[#B08D57]' : locked ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}`}
                strokeWidth={active ? 2 : 1.6}
              />
              <span className="flex-1 truncate leading-none">{item.label}</span>
              {locked && <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Pro</span>}
              {typeof quota === 'number' && (
                <span className="rounded-full bg-[#f5ede0] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#8a6d3f]">{quota}</span>
              )}
              {active && !locked && <span className="h-1.5 w-1.5 rounded-full bg-[#B08D57]" />}
            </Link>
          );
        })}
      </nav>

      {!portal.hasPaidAccess && (
        <div className="px-3 pb-3">
          <Link href="/business/dashboard/subscribe" onClick={onNavigate}
            className="block rounded-xl border border-[#e8d9bc] bg-[#fdf8f1] p-4 transition-all hover:border-[#c9a55a] hover:shadow-sm"
          >
            <p className="text-[12px] font-bold text-[#7a5f2a]">Activate Full Access</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Unlock AI leads, CRM, mailbox and research.</p>
            <div className="mt-3 inline-flex items-center rounded-lg bg-[#B08D57] px-3 py-1.5 text-[11px] font-bold text-white">
              View plans →
            </div>
          </Link>
        </div>
      )}

      <div className="border-t border-gray-100 p-3">
        <button onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
