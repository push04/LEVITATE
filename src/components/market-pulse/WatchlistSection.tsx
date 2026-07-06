'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Filter } from 'lucide-react';
import DigestCard, { type DigestCardData } from '@/components/market-pulse/DigestCard';

const RISK_RANK: Record<string, number> = { elevated: 0, moderate: 1, low: 2 };
const SIGNAL_RANK: Record<string, number> = { bullish: 0, neutral: 1, bearish: 2 };

type SortKey = 'default' | 'price_desc' | 'price_asc' | 'signal' | 'risk' | 'volume' | 'ticker';
type SignalFilter = 'all' | 'bullish' | 'bearish' | 'neutral';
type RiskFilter = 'all' | 'elevated' | 'moderate' | 'low';

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
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const sectors = useMemo(() => [...new Set(items.map((d) => d.sector).filter((s): s is string => !!s))].sort(), [items]);

  const filtered = useMemo(
    () =>
      items.filter(
        (d) =>
          (signalFilter === 'all' || d.trend_signal === signalFilter) &&
          (riskFilter === 'all' || d.risk_level === riskFilter) &&
          (sectorFilter === 'all' || d.sector === sectorFilter)
      ),
    [items, signalFilter, riskFilter, sectorFilter]
  );

  const sorted = useMemo(() => sortDigest(filtered, sortKey), [filtered, sortKey]);

  const selectClass = 'rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 type-caption text-[var(--text-secondary)]';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Filter className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <select value={signalFilter} onChange={(e) => setSignalFilter(e.target.value as SignalFilter)} className={selectClass}>
          <option value="all">All signals</option>
          <option value="bullish">Bullish only</option>
          <option value="bearish">Bearish only</option>
          <option value="neutral">Neutral only</option>
        </select>
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskFilter)} className={selectClass}>
          <option value="all">All risk levels</option>
          <option value="elevated">Elevated risk only</option>
          <option value="moderate">Moderate risk only</option>
          <option value="low">Low risk only</option>
        </select>
        {sectors.length > 1 && (
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className={selectClass}>
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={selectClass}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>
      {sorted.length === 0 ? (
        <div className="mt-4 rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center type-body text-[var(--text-tertiary)]">
          No stocks match these filters right now.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {sorted.map((d) => (
            <DigestCard key={d.ticker} d={d} priceEndpoint={priceEndpoint} />
          ))}
        </div>
      )}
    </div>
  );
}
