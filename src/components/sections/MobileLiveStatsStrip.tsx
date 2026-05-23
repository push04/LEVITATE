'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';

type StatValue = number | null;

type LiveStats = {
  totalLeads: StatValue;
  totalWebsitesDeployed: StatValue;
  totalActiveClients: StatValue;
};

async function fetchTableCount(table: string): Promise<StatValue> {
  const supabase = createClient();
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return typeof count === 'number' ? count : null;
}

export default function MobileLiveStatsStrip() {
  const [stats, setStats] = useState<LiveStats>({
    totalLeads: null,
    totalWebsitesDeployed: null,
    totalActiveClients: null,
  });

  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const refresh = async () => {
      const [leadsRes, websitesRes, clientsRes] = await Promise.allSettled([
        fetchTableCount('leads'),
        fetchTableCount('website_deployments'),
        fetchTableCount('workspaces'),
      ]);

      if (isCancelled) return;

      setStats({
        totalLeads: leadsRes.status === 'fulfilled' ? leadsRes.value : null,
        totalWebsitesDeployed: websitesRes.status === 'fulfilled' ? websitesRes.value : null,
        totalActiveClients: clientsRes.status === 'fulfilled' ? clientsRes.value : null,
      });
    };

    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel('homepage-mobile-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'website_deployments' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, () => scheduleRefresh())
      .subscribe();

    function scheduleRefresh() {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        refresh();
      }, 250);
    }

    return () => {
      isCancelled = true;
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="md:hidden">
      <div className="mt-6 md:mt-10 -mx-6 px-6">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StatCard label="Leads found" value={stats.totalLeads} />
          <StatCard label="Websites deployed" value={stats.totalWebsitesDeployed} />
          <StatCard label="Active clients" value={stats.totalActiveClients} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: StatValue }) {
  const display = typeof value === 'number' ? value.toLocaleString('en-IN') : '—';

  return (
    <div className="snap-start min-w-[220px] rounded-[14px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="type-subheading text-[var(--gold-bright)]">{label}</div>
      <div className="mt-2 type-stat-sm text-[var(--text-primary)]">{display}</div>
    </div>
  );
}
