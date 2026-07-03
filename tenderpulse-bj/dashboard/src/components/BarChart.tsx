import { useState } from "react";

// Single-hue horizontal bar chart for magnitude-by-category (one measure, one
// dimension — no series to distinguish, so one consistent hue per the
// dataviz skill rather than a different color per bar). Rounded data-ends,
// direct labels on the top entries, hover tooltip on the rest.
export function BarChart({ data, maxRows = 8 }: { data: { name: string; count: number }[]; maxRows?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = data.slice(0, maxRows);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const pct = (row.count / max) * 100;
        return (
          <div
            key={row.name}
            className="flex items-center gap-2 group"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="w-28 sm:w-36 shrink-0 text-xs text-ink-secondary dark:text-ink-secondary-dark truncate" title={row.name}>
              {row.name}
            </div>
            <div className="flex-1 h-5 relative bg-grid/40 dark:bg-grid-dark/40 rounded">
              <div
                className="h-full rounded bg-series-1 transition-all"
                style={{ width: `${pct}%`, minWidth: row.count > 0 ? "6px" : 0 }}
              />
              {hover === i && (
                <div className="absolute left-0 -top-7 bg-ink-primary text-white dark:bg-white dark:text-ink-primary text-[11px] rounded px-1.5 py-0.5 whitespace-nowrap shadow">
                  {row.name}: {row.count}
                </div>
              )}
            </div>
            <div className="w-10 text-right text-xs tabular text-ink-secondary dark:text-ink-secondary-dark">{row.count}</div>
          </div>
        );
      })}
      {rows.length === 0 && <div className="text-sm text-ink-muted">No data yet.</div>}
    </div>
  );
}
