'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Zap } from 'lucide-react';

const STATS = [
  { icon: Users, label: 'Leads scraped', value: 2400 },
  { icon: Zap, label: 'AI actions', value: 890 },
  { icon: TrendingUp, label: 'Revenue tracked', value: 145000 },
];

export default function MobileLiveStatsStrip() {
  const [counts, setCounts] = useState(STATS.map(() => 0));

  useEffect(() => {
    const timers = STATS.map((s, i) =>
      setInterval(() => {
        setCounts(prev => {
          const next = [...prev];
          next[i] = Math.min(s.value, next[i] + Math.ceil(s.value / 40));
          return next;
        });
      }, 30 + i * 10)
    );
    return () => timers.forEach(clearInterval);
  }, []);

  return (
    <div className="md:hidden mt-4 flex items-center justify-between gap-2 rounded-2xl border border-[rgba(176,141,87,0.15)] bg-[rgba(176,141,87,0.05)] px-4 py-3">
      {STATS.map((s, i) => (
        <div key={s.label} className="flex flex-col items-center gap-0.5">
          <s.icon className="h-3.5 w-3.5 text-[#B08D57]" strokeWidth={1.5} />
          <span className="font-data text-base font-bold text-[#1A1916]">
            {s.value === 145000 ? `₹${(counts[i] / 1000).toFixed(0)}k` : counts[i].toLocaleString()}
          </span>
          <span className="text-[10px] text-[#9B9890]">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
