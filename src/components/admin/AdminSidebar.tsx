'use client';

import { useProfile } from '@/hooks/useProfile';
import {
  Activity,
  Bot,
  Brain,
  Briefcase,
  ClipboardList,
  Database,
  FileText,
  Globe,
  IndianRupee,
  Key,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  PieChart,
  Rocket,
  TrendingUp,
  Users,
  UserCheck,
  Crosshair,
  Gavel,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LevitateLockup } from '@/components/brand/LevitateLogo';

const GROUPS = [
  {
    label: 'Core',
    items: [
      { label: 'Overview', icon: LayoutDashboard, href: '/admin/dashboard', roles: ['super_admin', 'admin', 'manager', 'employee', 'client', 'sales'] },
      { label: 'Projects', icon: Briefcase, href: '/admin/dashboard/projects', roles: ['super_admin', 'admin', 'manager', 'employee'] },
      { label: 'Team', icon: Users, href: '/admin/dashboard/team', roles: ['super_admin', 'admin', 'manager'] },
      { label: 'Files', icon: FileText, href: '/admin/dashboard/files', roles: ['super_admin', 'admin', 'manager', 'employee'] },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'CRM', icon: PieChart, href: '/admin/dashboard/leads', roles: ['super_admin', 'admin', 'sales'] },
      { label: 'Intake Responses', icon: ClipboardList, href: '/admin/dashboard/intake-responses', roles: ['super_admin', 'admin', 'sales'], badge: 'New' },
      { label: 'AI Lead Database', icon: Database, href: '/admin/dashboard/growth/potential-leads', roles: ['super_admin', 'admin', 'sales'], badge: 'AI' },
      { label: 'BizHarvest', icon: Crosshair, href: '/admin/dashboard/growth/bizharvest', roles: ['super_admin', 'admin', 'sales'], badge: 'New' },
      { label: 'Tenders (BJ)', icon: Gavel, href: '/admin/dashboard/tenders', roles: ['super_admin', 'admin', 'sales'], badge: 'New' },
      { label: 'Sales', icon: TrendingUp, href: '/admin/dashboard/sales', roles: ['super_admin', 'admin', 'manager', 'sales'] },
      { label: 'Revenue', icon: IndianRupee, href: '/admin/dashboard/revenue', roles: ['super_admin', 'admin'] },
      { label: 'Mailbox', icon: Mail, href: '/admin/dashboard/mailbox', roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Automation',
    items: [
      { label: 'AI Command Center', icon: Brain, href: '/admin/dashboard/ai', roles: ['super_admin', 'admin'], badge: 'NEW' },
      { label: 'AI Agents', icon: Bot, href: '/admin/dashboard/automations', roles: ['super_admin', 'admin'], badge: 'AI' },
      { label: 'WhatsApp', icon: MessageSquare, href: '/admin/dashboard/whatsapp', roles: ['super_admin', 'admin'] },
      { label: 'Live Logs', icon: Activity, href: '/admin/dashboard/logs', roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Website Builder', icon: Globe, href: '/admin/dashboard/website-builder', roles: ['super_admin', 'admin'] },
      { label: 'API Plans', icon: Key, href: '/admin/dashboard/api-portal/plans', roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Careers', icon: UserCheck, href: '/admin/dashboard/careers', roles: ['super_admin', 'admin'] },
      { label: 'Onboarding', icon: Rocket, href: '/admin/dashboard/onboarding', roles: ['super_admin', 'admin', 'manager'] },
    ],
  },
];

export default function AdminSidebar() {
  const { profile, isLoading } = useProfile();
  const pathname = usePathname();

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const role = profile?.role ?? '';

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="border-b border-gray-100 px-5 py-4">
        <LevitateLockup
          markClassName="h-9 w-9 rounded-[12px]"
          wordmarkClassName="text-[15px] font-semibold text-gray-900"
          suffix="OS"
          subtitle={`${profile?.role?.replace(/_/g, ' ') ?? 'team'} · admin`}
          subtitleClassName="text-[11px] text-gray-500 uppercase tracking-wide font-semibold"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {GROUPS.map((group) => {
          const visible = group.items.filter(i => i.roles.includes(role));
          if (!visible.length) return null;
          return (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{group.label}</p>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const isExternal = (item as any).external === true;
                  const active = !isExternal && (item.href === '/admin/dashboard'
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/'));
                  const className = `group flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                    active
                      ? 'bg-[#B08D57]/10 text-[#8a6d3f]'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`;
                  const content = (
                    <>
                      <item.icon
                        className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? 'text-[#B08D57]' : 'text-gray-400 group-hover:text-gray-600'}`}
                        strokeWidth={active ? 2 : 1.6}
                      />
                      <span className="flex-1 leading-none">{item.label}</span>
                      {(item as any).badge && (
                        <span className="rounded-full bg-[#B08D57]/15 px-2 py-0.5 text-[10px] font-bold text-[#8a6d3f]">
                          {(item as any).badge}
                        </span>
                      )}
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#B08D57]" />
                      )}
                    </>
                  );
                  return isExternal ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Opens the local TenderPulse dashboard — only reachable from the PC running Run_TenderPulse.bat"
                      className={className}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link key={item.href} href={item.href} className={className}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Profile + logout */}
      <div className="border-t border-gray-100 p-4">
        <div className="mb-2 flex items-center gap-3 rounded-[10px] bg-gray-50 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A96E] to-[#8C5917] text-[13px] font-bold text-white">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-gray-900">{profile?.full_name ?? 'User'}</p>
            <p className="truncate text-[11px] text-gray-400">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
