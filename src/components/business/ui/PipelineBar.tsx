import AnimatedNumber from './AnimatedNumber';

const COLOR_MAP = {
  new: 'var(--status-new)',
  progress: 'var(--status-progress)',
  closed: 'var(--status-closed)',
  gold: 'var(--gold-base)',
} as const;

export default function PipelineBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: keyof typeof COLOR_MAP;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 7 : 0) : 0;
  const colorValue = COLOR_MAP[color];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="type-label text-[var(--text-secondary)]">{label}</span>
        <span className="type-stat-sm text-[var(--text-primary)]">
          <AnimatedNumber value={value} />
        </span>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-[var(--bg-overlay)]">
        <div
          className="animate-levitate-line-shimmer h-full rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.12),rgba(255,255,255,0.34),rgba(255,255,255,0.12))]"
          style={{
            width: `${width}%`,
            backgroundColor: colorValue,
            boxShadow: `0 0 18px ${colorValue}33`,
          }}
        />
      </div>
    </div>
  );
}
