interface Props {
  value: number;
  label?: string;
  size?: number;
}

export default function ScoreArc({ value, label = 'Score', size = 112 }: Props) {
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - pct / 100);
  const color = pct >= 70 ? '#34D399' : pct >= 40 ? '#C9A55A' : '#6B7280';
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        {/* Background arc */}
        <path
          d={`M ${8} ${cy} A ${radius} ${radius} 0 0 1 ${size - 8} ${cy}`}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${8} ${cy} A ${radius} ${radius} 0 0 1 ${size - 8} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fontFamily="monospace"
          fill="var(--text-primary)"
        >
          {pct}
        </text>
      </svg>
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
    </div>
  );
}
