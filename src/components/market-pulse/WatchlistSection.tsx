'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import DigestCard, { type DigestCardData } from '@/components/market-pulse/DigestCard';

const RISK_RANK: Record<string, number> = { elevated: 0, moderate: 1, low: 2 };
const SIGNAL_RANK: Record<string, number> = { bullish: 0, neutral: 1, bearish: 2 };

type SortKey = 'default' | 'price_desc' | 'price_asc' | 'signal' | 'risk' | 'volume' | 'ticker';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'default', label: 'Default (movers first)' },
  { value: 'price_desc', label: 'Price change: high to low' },
  { value: 'price_asc', label: 'Price change: low to high' },
  { value: 'signal', label: 'Signal: bullish first' },
  { value: 'risk', label: 'Risk: elevated first' },
  { value: 'volume', label: 'Volume vs 20d avg' },
  { value: 'ticker', label: 'Ticker (A-Z)' },
];

function sortDigest(items: DigestCardData[], key: SortKey): DigestCardData[] {
  const sorted = [...items];
  switch (key) {
    case 'price_desc':
      return sorted.sort((a, b) => (b.price_change_pct ?? -Infinity) - (a.price_change_pct ?? -Infinity));
    case 'price_asc':
      return sorted.sort((a, b) => (a.price_change_pct ?? Infinity) - (b.price_change_pct ?? Infinity));
    case 'signal':
      return sorted.sort((a, b) => (SIGNAL_RANK[a.trend_signal] ?? 3) - (SIGNAL_RANK[b.trend_signal] ?? 3));
    case 'risk':
      return sorted.sort((a, b) => (RISK_RANK[a.risk_level ?? ''] ?? 3) - (RISK_RANK[b.risk_level ?? ''] ?? 3));
    case 'volume':
      return sorted.sort((a, b) => {
        const ratioA = a.volume != null && a.avg_volume_20 ? a.volume / a.avg_volume_20 : 0;
        const ratioB = b.volume != null && b.avg_volume_20 ? b.volume / b.avg_volume_20 : 0;
        return ratioB - ratioA;
      });
    case 'ticker':
      return sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
    default:
      return sorted;
  }
}

export default function WatchlistSection({ items, priceEndpoint }: { items: DigestCardData[]; priceEndpoint: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const sorted = useMemo(() => sortDigest(items, sortKey), [items, sortKey]);

  return (
    <div>
      <div className="flex items-center justify-end gap-2">
        <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 type-caption text-[var(--text-secondary)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 space-y-4">
        {sorted.map((d) => (
          <DigestCard key={d.ticker} d={d} priceEndpoint={priceEndpoint} />
        ))}
      </div>
    </div>
  );
}
