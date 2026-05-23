import AnimatedNumber from './AnimatedNumber';

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

function getToneColor(value: number) {
  if (value >= 90) return 'var(--gold-base)';
  if (value >= 75) return 'var(--status-closed)';
  if (value >= 60) return 'var(--status-progress)';
  if (value >= 40) return 'var(--status-new)';
  return 'var(--status-warn)';
}

export default function ScoreArc({
  value,
  max = 100,
  size = 88,
  label,
  compact = false,
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  compact?: boolean;
}) {
  const normalized = Math.max(0, Math.min(value, max));
  const percent = normalized / max;
  const color = getToneColor((normalized / max) * 100);
  const radius = compact ? 16 : 30;
  const strokeWidth = compact ? 4 : 6;
  const startAngle = 180;
  const endAngle = 180 + percent * 180;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={compact ? 42 : 54} viewBox={`0 0 ${size} ${compact ? 42 : 54}`} fill="none">
        <path
          d={describeArc(size / 2, compact ? 30 : 38, radius, 180, 360)}
          stroke="rgba(201, 165, 90, 0.12)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={describeArc(size / 2, compact ? 30 : 38, radius, startAngle, Math.max(endAngle, startAngle + 1))}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <text
          x="50%"
          y={compact ? '32' : '41'}
          textAnchor="middle"
          className={compact ? 'type-label' : 'type-stat-sm'}
          fill="var(--text-primary)"
        >
          {compact ? Math.round(normalized) : ''}
        </text>
      </svg>
      {!compact ? (
        <>
          <div className="type-stat-sm text-[var(--text-primary)]">
            <AnimatedNumber value={normalized} />
          </div>
          {label ? <div className="type-caption uppercase tracking-[0.18em]">{label}</div> : null}
        </>
      ) : null}
    </div>
  );
}
