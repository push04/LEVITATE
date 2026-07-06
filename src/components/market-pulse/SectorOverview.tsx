import { Building2 } from 'lucide-react';

type SectorInput = { sector: string | null; price_change_pct: number | null; trend_signal: string };

function aggregateBySector(items: SectorInput[]) {
  const bySector = new Map<string, { sum: number; n: number; bullish: number; bearish: number; neutral: number }>();
  for (const d of items) {
    const sector = d.sector ?? 'Other';
    const bucket = bySector.get(sector) ?? { sum: 0, n: 0, bullish: 0, bearish: 0, neutral: 0 };
    if (d.price_change_pct != null) {
      bucket.sum += d.price_change_pct;
      bucket.n++;
    }
    if (d.trend_signal === 'bullish') bucket.bullish++;
    else if (d.trend_signal === 'bearish') bucket.bearish++;
    else bucket.neutral++;
    bySector.set(sector, bucket);
  }

  return [...bySector.entries()]
    .map(([sector, b]) => ({ sector, avgChangePct: b.n > 0 ? b.sum / b.n : 0, count: b.bullish + b.bearish + b.neutral, bullish: b.bullish, bearish: b.bearish, neutral: b.neutral }))
    .sort((a, b) => b.avgChangePct - a.avgChangePct);
}

// Aggregated purely from today's digest, already fetched, no extra query.
// Answers a genuinely different question than the per-stock cards: where is
// money moving today, sector by sector, useful for a business owner
// deciding where surplus cash might go.
export function SectorOverviewTable({ items }: { items: SectorInput[] }) {
  const rows = aggregateBySector(items);
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-[16px] border border-[var(--border-default)]">
      <table className="w-full min-w-[480px] text-left">
        <thead>
          <tr className="border-b border-[var(--border-default)] type-caption text-[var(--text-tertiary)]">
            <th className="px-4 py-3 font-medium">Sector</th>
            <th className="px-4 py-3 font-medium">Avg. move</th>
            <th className="px-4 py-3 font-medium">Stocks</th>
            <th className="px-4 py-3 font-medium">Bullish / Bearish / Neutral</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sector} className="border-b border-[var(--border-default)] last:border-0">
              <td className="px-4 py-3 type-body font-medium text-[var(--text-primary)]">{r.sector}</td>
              <td className={`px-4 py-3 type-body font-semibold ${r.avgChangePct > 0 ? 'text-[var(--status-closed)]' : r.avgChangePct < 0 ? 'text-[#9a5252]' : 'text-[var(--text-secondary)]'}`}>
                {r.avgChangePct > 0 ? '+' : ''}
                {r.avgChangePct.toFixed(2)}%
              </td>
              <td className="px-4 py-3 type-caption text-[var(--text-tertiary)]">{r.count}</td>
              <td className="px-4 py-3 type-caption text-[var(--text-tertiary)]">
                <span className="text-[var(--status-closed)]">{r.bullish}</span>
                {' / '}
                <span className="text-[#9a5252]">{r.bearish}</span>
                {' / '}
                <span>{r.neutral}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Full marketing-page section (heading + copy + table) for the public page.
export default function SectorOverview({ items }: { items: SectorInput[] }) {
  if (aggregateBySector(items).length === 0) return null;

  return (
    <section className="border-b border-[var(--border-default)] px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2 type-subheading text-[var(--text-accent)]">
          <Building2 className="h-4 w-4" />
          Sector overview
        </div>
        <h2 className="font-serif-display mt-2 text-[26px] text-[var(--text-primary)]">Where today&rsquo;s movement is concentrated</h2>
        <p className="mt-2 max-w-xl type-body text-[var(--text-secondary)]">
          Today&rsquo;s watchlist grouped by sector: average price move, and how many stocks lean bullish, bearish, or neutral in each.
        </p>
        <div className="mt-8">
          <SectorOverviewTable items={items} />
        </div>
      </div>
    </section>
  );
}
