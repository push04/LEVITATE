type BarColor = 'new' | 'progress' | 'closed' | 'gold';

const colorMap: Record<BarColor, string> = {
  gold: 'bg-[var(--gold-base)]',
  new: 'bg-slate-400',
  progress: 'bg-blue-400',
  closed: 'bg-emerald-400',
};

interface Props {
  label: string;
  value: number;
  max: number;
  color?: BarColor;
}

export default function PipelineBar({ label, value, max, color = 'gold' }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold tabular-nums text-[var(--text-primary)]">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-default)]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorMap[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
