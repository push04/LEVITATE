const CATEGORY_LABELS: Record<string, string> = {
  civil_works: "Civil Works",
  supply: "Supply",
  services: "Services",
  it: "IT",
  mining: "Mining",
  health: "Health",
  education: "Education",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  civil_works: "bg-series-1/10 text-series-1",
  supply: "bg-series-2/10 text-series-2",
  services: "bg-series-3/10 text-series-3",
  it: "bg-series-5/10 text-series-5",
  mining: "bg-series-8/10 text-series-8",
  health: "bg-series-6/10 text-series-6",
  education: "bg-series-7/10 text-series-7",
  other: "bg-ink-muted/10 text-ink-muted",
};

export function CategoryChip({ category }: { category?: string }) {
  const key = category || "other";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${CATEGORY_COLORS[key] || CATEGORY_COLORS.other}`}>
      {CATEGORY_LABELS[key] || key}
    </span>
  );
}

export { CATEGORY_LABELS };

export function DeadlineBadge({ deadline, publishDate }: { deadline?: string | null; publishDate?: string | null }) {
  if (!deadline) {
    // No closing date on the source listing — fall back to when the notice
    // was published rather than showing nothing, since that's still real,
    // useful information (some sources only ever expose an issue date).
    if (publishDate) {
      return (
        <span className="text-ink-muted text-xs" title="This source doesn't list a closing date — showing publish date instead">
          Published {new Date(publishDate).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
        </span>
      );
    }
    return <span className="text-ink-muted text-xs">No date listed</span>;
  }
  const d = new Date(deadline);
  const now = new Date();
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let color = "text-ink-secondary dark:text-ink-secondary-dark";
  if (daysLeft < 0) color = "text-ink-muted line-through";
  else if (daysLeft <= 2) color = "text-status-critical font-semibold";
  else if (daysLeft <= 7) color = "text-status-warning font-semibold";

  return (
    <span className={`text-xs tabular ${color}`}>
      {d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
      {daysLeft >= 0 && <span className="ml-1 text-[10px] opacity-80">({daysLeft}d)</span>}
    </span>
  );
}
