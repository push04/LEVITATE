'use client';

import { useProfile } from '@/hooks/useProfile';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Briefcase,
  FileText,
  LogOut,
  PieChart,
  Mail,
  Rocket,
  Bot,
  IndianRupee,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LevitateLockup } from '@/components/brand/LevitateLogo';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminSidebar() {
  const { profile, isLoading } = useProfile();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  const menuItems = [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      href: '/admin/dashboard',
      roles: ['super_admin', 'admin', 'manager', 'employee', 'client', 'sales'],
    },
    {
      label: 'Team',
      icon: Users,
      href: '/admin/dashboard/team',
      roles: ['super_admin', 'admin', 'manager'],
    },
    {
      label: 'Projects',
      icon: Briefcase,
      href: '/admin/dashboard/projects',
      roles: ['super_admin', 'admin', 'manager', 'employee'],
    },
    {
      label: 'Mailbox',
      icon: Mail,
      href: '/admin/dashboard/mailbox',
      roles: ['super_admin', 'admin'],
    },
    {
      label: 'CRM',
      icon: PieChart,
      href: '/admin/dashboard/leads',
      roles: ['super_admin', 'admin', 'sales'],
    },
    {
      label: 'Files',
      icon: FileText,
      href: '/admin/dashboard/files',
      roles: ['super_admin', 'admin', 'manager', 'employee'],
    },
    {
      label: 'Careers',
      icon: Users,
      href: '/admin/dashboard/careers',
      roles: ['super_admin', 'admin'],
    },
    {
      label: 'Sales Pipeline',
      icon: PieChart,
      href: '/admin/dashboard/sales',
      roles: ['super_admin', 'admin', 'manager', 'sales'],
      specialAccess: 'sales-marketing',
    },
    {
      label: 'Automations',
      icon: Bot,
      href: '/admin/dashboard/automations',
      roles: ['super_admin', 'admin'],
      badge: 'AI',
    },
    {
      label: 'WhatsApp',
      icon: MessageSquare,
      href: '/admin/dashboard/whatsapp',
      roles: ['super_admin', 'admin'],
      badge: 'Local',
    },
    {
      label: 'Revenue',
      icon: IndianRupee,
      href: '/admin/dashboard/revenue',
      roles: ['super_admin', 'admin'],
    },
    {
      label: 'Onboarding',
      icon: Rocket,
      href: '/admin/dashboard/onboarding',
      roles: ['super_admin', 'admin', 'manager'],
    },
    {
      label: 'Live Logs',
      icon: Activity,
      href: '/admin/dashboard/logs',
      roles: ['super_admin', 'admin'],
    },
  ];

  if (isLoading) return <div className="h-screen w-64 border-r border-[var(--border)] bg-[var(--surface)]" />;

  const filteredMenu = menuItems.filter((item) => {
    if (!profile?.role) return false;

    const hasRole = item.roles.includes(profile.role);
    // @ts-ignore department relation is not typed on profile
    const hasDepartment = item.specialAccess && profile.departments?.slug === item.specialAccess;

    return hasRole || hasDepartment;
  });

  return (
    <div className="sticky top-0 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-5">
        <LevitateLockup
          markClassName="h-10 w-10 rounded-[14px]"
          wordmarkClassName="text-base text-[var(--foreground)]"
          suffix="OS"
          subtitle={`AI agency | ${profile?.role?.replace('_', ' ') || 'team'}`}
          subtitleClassName="text-[var(--muted)]"
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href || ((item as any).subItems && pathname.startsWith(item.href));
          const isSubItemActive = (subHref: string) => pathname === subHref;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all ${
                  isActive
                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                    : 'text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {/* @ts-ignore badge is optional */}
                {item.badge && (
                  <span className="rounded bg-[var(--primary)]/20 px-1.5 py-0.5 text-xs font-bold text-[var(--primary)]">
                    {/* @ts-ignore badge is optional */}
                    {item.badge}
                  </span>
                )}
              </Link>

              {/* @ts-ignore subItems is optional */}
              {item.subItems && isActive && (
                <div className="ml-12 mt-1 space-y-1 border-l-2 border-[var(--border)] pl-2">
                  {/* @ts-ignore subItems is optional */}
                  {item.subItems.map((sub: any) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        isSubItemActive(sub.href)
                          ? 'bg-[var(--secondary)] font-medium text-[var(--foreground)]'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="text-xs text-[var(--muted)]">Theme</span>
          <ThemeToggle />
        </div>
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8c5917] font-bold text-white">
            {profile?.full_name?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium">{profile?.full_name || 'User'}</p>
            <p className="truncate text-xs text-[var(--muted)]">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

