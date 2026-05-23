'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  Building2,
  Database,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CompanySidebar() {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState('Company Operations');
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadCompany = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setOwnerEmail(user.email ?? null);

      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (company?.name) {
        setCompanyName(company.name);
      }
    };

    loadCompany();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      window.location.href = '/company/login';
    }
  };

  const menuItems = [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      href: '/company/dashboard',
    },
    {
      label: 'CRM',
      icon: Database,
      href: '/company/dashboard/crm',
    },
    {
      label: 'Automations',
      icon: Bot,
      href: '/company/dashboard/automations',
    },
    {
      label: 'Mailbox',
      icon: Mail,
      href: '/company/dashboard/mailbox',
    },
    {
      label: 'Growth',
      icon: TrendingUp,
      href: '/company/dashboard/growth',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/company/dashboard/settings',
    },
  ];

  return (
    <div className="sticky top-0 flex h-screen w-full flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--foreground)]">{companyName}</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Company tools</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Signed-in account</div>
          <div className="mt-2 truncate text-sm text-[var(--foreground)]">{ownerEmail || 'Loading...'}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                isActive
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-indigo-500'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
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
