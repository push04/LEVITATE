import { useRef, useState } from "react";

// Single-series line chart (tenders discovered per day). One hue, 2px line,
// crosshair + tooltip on hover per the dataviz skill's interaction spec.
export function TrendChart({ data }: { data: [string, number][] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) return <div className="text-sm text-ink-muted">No data yet.</div>;

  const width = 600;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 24, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((d) => d[1]);
  const maxV = Math.max(1, ...values);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d[1] / maxV) * innerH,
    label: d[0],
    value: d[1],
  }));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x},${padding.top + innerH} L${points[0].x},${padding.top + innerH} Z`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIdx(closest);
  }

  const hovered = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-40"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* gridlines */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * t}
            y2={padding.top + innerH * t}
            className="stroke-grid dark:stroke-grid-dark"
            strokeWidth={1}
          />
        ))}
        <path d={areaPath} fill="#2a78d6" opacity={0.08} />
        <path d={path} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={padding.top}
              y2={padding.top + innerH}
              className="stroke-baseline dark:stroke-baseline-dark"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="#2a78d6" stroke="white" strokeWidth={1.5} />
          </>
        )}
        {/* x-axis labels: first, middle, last */}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
          <text
            key={i}
            x={points[i].x}
            y={height - 6}
            textAnchor="middle"
            className="fill-ink-muted text-[9px]"
          >
            {points[i].label.slice(5)}
          </text>
        ))}
      </svg>
      {hovered && (
        <div
          className="absolute top-0 -translate-x-1/2 bg-ink-primary text-white dark:bg-white dark:text-ink-primary text-[11px] rounded px-2 py-1 shadow pointer-events-none"
          style={{ left: `${(hovered.x / width) * 100}%` }}
        >
          {hovered.label}: {hovered.value} new
        </div>
      )}
    </div>
  );
}
