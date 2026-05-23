type DonutDatum = {
  label: string;
  value: number;
  color: string;
};

function describeDonutArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = {
    x: cx + radius * Math.cos(startAngle),
    y: cy + radius * Math.sin(startAngle),
  };
  const end = {
    x: cx + radius * Math.cos(endAngle),
    y: cy + radius * Math.sin(endAngle),
  };
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function DonutChart({
  title,
  data,
  valueLabel,
}: {
  title?: string;
  data: DonutDatum[];
  valueLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -Math.PI / 2;

  return (
    <div className="grid gap-5 md:grid-cols-[128px_minmax(0,1fr)] md:items-center">
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          <circle cx="60" cy="60" r="34" stroke="rgba(201,165,90,0.08)" strokeWidth="18" fill="none" />
          {data.map((item) => {
            const angle = total > 0 ? (item.value / total) * Math.PI * 2 : 0;
            const nextAngle = currentAngle + angle;
            const path = describeDonutArc(60, 60, 34, currentAngle, nextAngle);
            currentAngle = nextAngle;

            return (
              <path
                key={item.label}
                d={path}
                stroke={item.color}
                strokeWidth="18"
                strokeLinecap="round"
                fill="none"
                style={{ filter: `drop-shadow(0 0 10px ${item.color}33)` }}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="type-stat-sm text-[var(--text-primary)]">{total}</div>
          {valueLabel ? <div className="type-caption">{valueLabel}</div> : null}
        </div>
      </div>
      <div>
        {title ? <div className="type-heading text-[var(--text-primary)]">{title}</div> : null}
        <div className="mt-4 space-y-3">
          {data.map((item) => {
            const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="type-body text-[var(--text-secondary)]">{item.label}</span>
                </div>
                <div className="type-mono text-[var(--text-primary)]">{share}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
