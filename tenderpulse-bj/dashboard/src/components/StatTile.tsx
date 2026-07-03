export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warning" | "critical";
}) {
  const toneClass = {
    default: "text-ink-primary dark:text-ink-primary-dark",
    good: "text-status-good",
    warning: "text-status-warning",
    critical: "text-status-critical",
  }[tone];

  return (
    <div className="bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl p-4">
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular ${toneClass}`}>{value}</div>
    </div>
  );
}
