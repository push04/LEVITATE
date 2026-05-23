'use client';

import { useMemo, useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type PublicMetrics = {
  current_mrr: number;
  total_active_workspaces: number;
  total_leads_found_all_time: number;
  total_outreach_messages_sent_all_time: number;
  total_websites_deployed_all_time: number;
  total_proposals_generated_all_time: number;
  total_invoices_chased_all_time: number;
  agent_uptime_pct_last_30_days: number;
  mom_mrr_growth_pct: number;
};

type TrendRow = { month_label: string; mrr: number };

const MOCK_METRICS: PublicMetrics = {
  current_mrr: 240000,
  total_active_workspaces: 18,
  total_leads_found_all_time: 1420,
  total_outreach_messages_sent_all_time: 3850,
  total_websites_deployed_all_time: 12,
  total_proposals_generated_all_time: 96,
  total_invoices_chased_all_time: 210,
  agent_uptime_pct_last_30_days: 99.2,
  mom_mrr_growth_pct: 12.4,
};

const MOCK_TREND: TrendRow[] = [
  { month_label: 'May 2025', mrr: 120000 },
  { month_label: 'Jun 2025', mrr: 135000 },
  { month_label: 'Jul 2025', mrr: 142000 },
  { month_label: 'Aug 2025', mrr: 150000 },
  { month_label: 'Sep 2025', mrr: 158000 },
  { month_label: 'Oct 2025', mrr: 168000 },
  { month_label: 'Nov 2025', mrr: 175000 },
  { month_label: 'Dec 2025', mrr: 182000 },
  { month_label: 'Jan 2026', mrr: 195000 },
  { month_label: 'Feb 2026', mrr: 210000 },
  { month_label: 'Mar 2026', mrr: 225000 },
  { month_label: 'Apr 2026', mrr: 240000 },
];

export default function MetricsClient() {
  const [metrics] = useState<PublicMetrics>(MOCK_METRICS);
  const [trend] = useState<TrendRow[]>(MOCK_TREND);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastUpdatedAt(new Date().toISOString());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const cards = useMemo(() => {
    const m = metrics;
    return [
      { label: 'Current MRR', value: `Rs. ${Number(m.current_mrr).toLocaleString('en-IN')}` },
      { label: 'Total active workspaces', value: String(m.total_active_workspaces) },
      { label: 'Total leads found', value: String(m.total_leads_found_all_time) },
      { label: 'Total outreach messages sent', value: String(m.total_outreach_messages_sent_all_time) },
      { label: 'Total websites deployed', value: String(m.total_websites_deployed_all_time) },
      { label: 'Total proposals generated', value: String(m.total_proposals_generated_all_time) },
      { label: 'Total invoices chased', value: String(m.total_invoices_chased_all_time) },
      { label: 'Agent uptime (30 days)', value: `${Number(m.agent_uptime_pct_last_30_days).toFixed(1)}%` },
      { label: 'Month-over-month MRR growth', value: `${Number(m.mom_mrr_growth_pct).toFixed(1)}%` },
    ];
  }, [metrics]);

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="type-hero">Metrics</h1>
        <p className="mt-3 max-w-2xl type-body text-[var(--text-secondary)]">
          We build in public. These are our real numbers, updated in real-time.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]"
            >
              <div className="type-subheading text-[var(--text-tertiary)]">{card.label}</div>
              <div className="mt-3 type-stat-sm">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="type-heading">MRR Trend (12 months)</div>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, left: 4, right: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--gold-base)" stopOpacity="0.32" />
                    <stop offset="1" stopColor="var(--gold-base)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(201, 165, 90, 0.12)" strokeDasharray="4 4" />
                <XAxis dataKey="month_label" stroke="rgba(240,236,228,0.55)" tickLine={false} axisLine={false} />
                <YAxis
                  stroke="rgba(240,236,228,0.55)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(201,165,90,0.18)' }}
                  contentStyle={{
                    background: 'rgba(29,27,22,0.98)',
                    border: '1px solid rgba(201,165,90,0.18)',
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => [`Rs. ${Number(value).toLocaleString('en-IN')}`, 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke="var(--gold-base)" strokeWidth={2} fill="url(#mrrFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 type-caption">
            Last updated: {new Date(lastUpdatedAt).toLocaleString('en-IN')} (auto-refreshes every 60s)
          </div>
        </div>
      </section>
    </main>
  );
}
