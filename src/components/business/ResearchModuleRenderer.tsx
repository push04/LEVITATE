'use client';

import type { ReactNode } from 'react';
import type {
  AccentTone,
  BarDatum,
  DonutDatum,
  HeatmapItem,
  LineSeries,
  RadarDatum,
  ResearchModuleResult,
  ScatterDatum,
} from '@/lib/business-intelligence';
import {
  isRecoverableResearchRateLimitMessage,
  normalizeResearchModulePayload,
} from '@/lib/business-intelligence';

const TONE_ACCENTS: Record<AccentTone, string> = {
  gold: '#c8a96e',
  blue: '#6f9cd7',
  green: '#62b38b',
  red: '#ca6b65',
  orange: '#d28c55',
  neutral: '#7c756b',
};

const PAPER_SECTION =
  'rounded-[28px] border border-[#dccab5] bg-[#fffaf3] p-6 shadow-[0_18px_48px_rgba(73,48,19,0.08)]';
const PAPER_PANEL =
  'rounded-2xl border border-[#e4d6c4] bg-[rgba(255,255,255,0.9)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]';
const PAPER_PANEL_LG =
  'rounded-2xl border border-[#e4d6c4] bg-[rgba(255,255,255,0.9)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toneClasses(tone: AccentTone = 'neutral') {
  if (tone === 'gold') return 'border-[#d4bc93] bg-[#faf0dd] text-[#8d6128]';
  if (tone === 'blue') return 'border-[#c8d7ea] bg-[#eff5fb] text-[#4c6f94]';
  if (tone === 'green') return 'border-[#c7dfd3] bg-[#edf7f1] text-[#3d7658]';
  if (tone === 'red') return 'border-[#e5c0bc] bg-[#fbefee] text-[#9b4f4b]';
  if (tone === 'orange') return 'border-[#ecd0bb] bg-[#fcf2ea] text-[#9c6331]';
  return 'border-[#dfd4c7] bg-[#f8f4ee] text-[#65584b]';
}

function statusClasses(status: ResearchModuleResult['status']) {
  if (status === 'complete') return 'border-[#c9decf] bg-[#edf7f0] text-[#3e7556]';
  if (status === 'failed') return 'border-[#e7c3be] bg-[#fbefee] text-[#9e4e4b]';
  return 'border-[#dcc7a3] bg-[#faf0dd] text-[#926a35]';
}

function scoreToneColor(score: number) {
  if (score >= 85) return '#b18433';
  if (score >= 70) return '#4a8a66';
  if (score >= 55) return '#b6843d';
  return '#b05f57';
}

function chartColor(tone?: AccentTone, fallback = TONE_ACCENTS.gold) {
  return tone ? TONE_ACCENTS[tone] : fallback;
}

function getNumericDomain(values: number[], fallback: [number, number] = [0, 100]) {
  if (values.length === 0) {
    return { min: fallback[0], max: fallback[1] };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const padding = Math.max(1, Math.abs(max) * 0.1 || 1);
    return { min: min - padding, max: max + padding };
  }

  const padding = (max - min) * 0.1;
  return { min: min - padding, max: max + padding };
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

function buildLinearPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function buildAreaPath(upperPoints: Array<{ x: number; y: number }>, lowerPoints: Array<{ x: number; y: number }>) {
  if (upperPoints.length === 0 || lowerPoints.length === 0) {
    return '';
  }

  return `${buildLinearPath(upperPoints)} L ${lowerPoints
    .slice()
    .reverse()
    .map((point) => `${point.x} ${point.y}`)
    .join(' L ')} Z`;
}

function buildPolygonPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function ChartShell({
  title,
  children,
  footer,
  className = '',
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${PAPER_PANEL_LG} ${className}`.trim()}>
      <div className="text-lg font-semibold text-[#24190f]">{title}</div>
      <div className="mt-4">{children}</div>
      {footer ? <div className="mt-4 text-sm leading-6 text-[#6f6152]">{footer}</div> : null}
    </div>
  );
}

function getResponsiveGridClass(count: number, maxColumns: 4) {
  const safeCount = Math.max(1, Math.min(count, maxColumns));

  if (maxColumns <= 2) {
    return safeCount === 1 ? 'grid-cols-1' : 'lg:grid-cols-2';
  }

  if (safeCount === 1) {
    return 'grid-cols-1';
  }

  if (safeCount === 2) {
    return 'md:grid-cols-2';
  }

  if (safeCount === 3) {
    return 'md:grid-cols-2 xl:grid-cols-3';
  }

  return 'md:grid-cols-2 xl:grid-cols-4';
}

function formatCountdown(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function WaitingModuleCard({
  title,
  retryCountdownSeconds,
}: {
  title: string;
  retryCountdownSeconds?: number | null;
}) {
  const hasTimer = typeof retryCountdownSeconds === 'number' && retryCountdownSeconds > 0;
  const formattedCountdown = formatCountdown(retryCountdownSeconds);

  return (
    <section className={PAPER_SECTION}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.22em] text-[#7d6e60]">Research module</div>
          <h2 className="mt-3 text-2xl font-bold text-[#24190f]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[#6f6152]">
            {hasTimer
              ? `This section is queued in the current capacity window. LevitateOS will resume it automatically and keep the run alive even if you switch tabs.`
              : 'Collecting live signals, shaping the structured output, and waiting for the next safe execution window.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#dcc7a3] bg-[#faf0dd] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#926a35]">
            {hasTimer ? 'Queued' : 'Loading'}
          </span>
          {hasTimer ? (
            <div className="rounded-[18px] border border-[#e4d6c4] bg-[rgba(255,255,255,0.94)] px-4 py-3 shadow-[0_12px_24px_rgba(73,48,19,0.05)]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#8a7456]">Automatic resume</div>
              <div className="mt-1 text-2xl font-bold text-[#24190f]">{formattedCountdown ?? 'Syncing'}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-full border border-[#e1d1bb] bg-[#f2e5d4]">
        <div className="h-2.5 animate-levitate-pulse rounded-full bg-[linear-gradient(90deg,#d0ad6b_0%,#edd7ae_50%,#d0ad6b_100%)]" />
      </div>
    </section>
  );
}

function ModuleScoreDial({ score, compact = false }: { score: number; compact?: boolean }) {
  const normalized = clamp(score, 0, 100);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;

  return (
    <div className={`rounded-[22px] border border-[#e4d6c4] bg-[rgba(255,255,255,0.95)] shadow-[0_12px_24px_rgba(73,48,19,0.05)] ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
      <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
        <div className={`relative shrink-0 ${compact ? 'h-[62px] w-[62px]' : 'h-[74px] w-[74px]'}`}>
          <svg viewBox="0 0 74 74" className="h-full w-full">
            <circle cx="37" cy="37" r={radius} stroke="#eadccc" strokeWidth="7" fill="none" />
            <circle
              cx="37"
              cy="37"
              r={radius}
              stroke={scoreToneColor(normalized)}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
                transform="rotate(-90 37 37)"
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-bold text-[#24190f] ${compact ? 'text-lg' : 'text-xl'}`}>{normalized}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#8a7456]">Module score</div>
          <div className={`mt-1 text-[#6f6152] ${compact ? 'text-xs leading-5' : 'text-sm leading-6'}`}>
            {compact
              ? 'Quality-weighted score for this section.'
              : 'Weighted quality signal for this section based on evidence strength and strategic clarity.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeatmapGrid({ items }: { items: HeatmapItem[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 rounded-2xl border border-[#e4d6c4] bg-[rgba(255,255,255,0.84)] p-4">
        {Array.from({ length: 5 }).flatMap((_, rowIndex) =>
          Array.from({ length: 5 }).map((__, colIndex) => {
            const probability = colIndex + 1;
            const impact = 5 - rowIndex;
            const hasItem = items.some((item) => item.probability === probability && item.impact === impact);

            let zone = 'bg-emerald-500/10';
            if (impact + probability >= 8) zone = 'bg-red-500/10';
            else if (impact + probability >= 6) zone = 'bg-amber-500/10';
            else if (impact + probability >= 4) zone = 'bg-[#c8a96e]/10';

            return (
              <div
                key={`${impact}-${probability}`}
                className={`min-h-[72px] rounded-xl border border-[#e3d6c7] ${zone} p-2 text-[10px] text-[#7a6c5d]`}
              >
                <div className="mb-1 font-medium text-[#382a1f]/75">P{probability} / I{impact}</div>
                <div className="space-y-1">
                  {items
                    .filter((item) => item.probability === probability && item.impact === impact)
                    .slice(0, 2)
                    .map((item) => (
                      <div key={item.label} className="rounded bg-[rgba(255,255,255,0.78)] px-1.5 py-1 text-[9px] text-[#382a1f]/78">
                        {item.label}
                      </div>
                    ))}
                </div>
                {!hasItem ? <div className="pt-3 text-center text-[8px] uppercase tracking-[0.18em]">No risk</div> : null}
              </div>
            );
          })
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.slice(0, 5).map((item) => (
          <div key={item.label} className={PAPER_PANEL}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-[#24190f]">{item.label}</div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(item.tone)}`}>
                P{item.probability} / I{item.impact}
              </span>
            </div>
            {item.detail ? <p className="mt-3 text-sm leading-6 text-[#6f6152]">{item.detail}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConcentricRings({
  rings,
}: {
  rings: Array<{ label: string; value: string; share: number; growth?: string }>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="relative mx-auto h-[280px] w-[280px]">
        {rings.map((ring, index) => {
          const size = 280 - index * 56;
          const inset = (280 - size) / 2;
          return (
            <div
              key={ring.label}
              className="absolute rounded-full border"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${inset}px`,
                top: `${inset}px`,
                borderColor: `${index === 0 ? '#c8a96e' : index === 1 ? '#6f9cd7' : '#62b38b'}55`,
                background: `${index === 0 ? '#c8a96e' : index === 1 ? '#6f9cd7' : '#62b38b'}10`,
              }}
            />
          );
        })}
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#7d6e60]">Market structure</div>
            <div className="mt-2 text-3xl font-bold text-[#24190f]">{rings[1]?.value ?? rings[0]?.value}</div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {rings.map((ring, index) => (
          <div key={ring.label} className={PAPER_PANEL}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#24190f]">{ring.label}</div>
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: index === 0 ? '#c8a96e' : index === 1 ? '#6f9cd7' : '#62b38b' }}
              />
            </div>
            <div className="mt-2 text-xl font-bold text-[#24190f]">{ring.value}</div>
            <div className="mt-1 text-sm text-[#706254]">{ring.growth ? `Growth ${ring.growth}` : `${ring.share}% of total opportunity`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutSvg({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-[220px] w-[220px]">
        <svg viewBox="0 0 220 220" className="h-full w-full">
          <circle cx="110" cy="110" r="72" stroke="#efe3d3" strokeWidth="22" fill="none" />
          {data.map((item, index) => {
            const share = total > 0 ? (item.value / total) * 360 : 0;
            const startAngle =
              -90 +
              data
                .slice(0, index)
                .reduce((sum, previous) => sum + (total > 0 ? (previous.value / total) * 360 : 0), 0);
            const endAngle = startAngle + share;
            const path = describeArc(110, 110, 72, startAngle, endAngle);
            const color = item.color || chartColor('gold');

            return (
              <path
                key={item.name}
                d={path}
                stroke={color}
                strokeWidth="22"
                strokeLinecap="round"
                fill="none"
                aria-label={`${item.name}: ${item.value}`}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-[#7d6e60]">Total</div>
          <div className="mt-2 text-3xl font-bold text-[#24190f]">{total}</div>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item) => {
          const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const color = item.color || chartColor('gold');
          return (
            <div key={item.name} className="flex items-center justify-between gap-4 rounded-xl border border-[#e9dccd] bg-[rgba(250,245,238,0.86)] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-[#24190f]">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#24190f]">{item.value}</div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#7d6e60]">{share}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarChartSvg({
  data,
  orientation = 'vertical',
}: {
  data: BarDatum[];
  orientation?: 'horizontal' | 'vertical';
}) {
  if (orientation === 'horizontal') {
    const maxValue = Math.max(1, ...data.map((item) => item.value));
    return (
      <div className="space-y-4">
        {data.map((item) => {
          const color = chartColor(item.tone);
          const width = clamp((item.value / maxValue) * 100, item.value > 0 ? 6 : 0, 100);

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[#24190f]">{item.label}</div>
                <div className="text-sm font-semibold text-[#24190f]">{item.value}</div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#efe3d3]">
                <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
              </div>
              {item.detail ? <div className="text-xs leading-5 text-[#7d6e60]">{item.detail}</div> : null}
            </div>
          );
        })}
      </div>
    );
  }

  const chartWidth = 440;
  const chartHeight = 260;
  const margin = { top: 20, right: 12, bottom: 52, left: 18 };
  const usableWidth = chartWidth - margin.left - margin.right;
  const usableHeight = chartHeight - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const columnWidth = usableWidth / Math.max(data.length, 1);
  const barWidth = Math.min(36, columnWidth * 0.58);

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full">
      {Array.from({ length: 4 }).map((_, index) => {
        const y = margin.top + (usableHeight / 3) * index;
        return <line key={index} x1={margin.left} y1={y} x2={chartWidth - margin.right} y2={y} stroke="#eadfd1" strokeDasharray="4 4" />;
      })}

      {data.map((item, index) => {
        const color = chartColor(item.tone);
        const barHeight = (item.value / maxValue) * usableHeight;
        const x = margin.left + index * columnWidth + (columnWidth - barWidth) / 2;
        const y = margin.top + usableHeight - barHeight;
        return (
          <g key={item.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="12"
              fill={color}
              aria-label={`${item.label}: ${item.value}`}
            />
            <text x={x + barWidth / 2} y={chartHeight - 14} textAnchor="middle" fontSize="10" fill="#7d6e60">
              {item.label.length > 14 ? `${item.label.slice(0, 12)}..` : item.label}
            </text>
            <text x={x + barWidth / 2} y={Math.max(y - 8, margin.top + 12)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#24190f">
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScatterPlotSvg({ data, xLabel, yLabel }: { data: ScatterDatum[]; xLabel: string; yLabel: string }) {
  const width = 460;
  const height = 290;
  const margin = { top: 20, right: 24, bottom: 48, left: 52 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const xDomain = getNumericDomain(data.map((item) => item.x), [0, 100]);
  const yDomain = getNumericDomain(data.map((item) => item.y), [0, 100]);
  const zDomain = getNumericDomain(data.map((item) => item.z), [1, 10]);

  const scaleX = (value: number) => margin.left + ((value - xDomain.min) / (xDomain.max - xDomain.min)) * chartWidth;
  const scaleY = (value: number) => margin.top + chartHeight - ((value - yDomain.min) / (yDomain.max - yDomain.min)) * chartHeight;
  const scaleR = (value: number) => 8 + ((value - zDomain.min) / (zDomain.max - zDomain.min || 1)) * 18;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {Array.from({ length: 5 }).map((_, index) => {
        const y = margin.top + (chartHeight / 4) * index;
        const x = margin.left + (chartWidth / 4) * index;
        return (
          <g key={index}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#eadfd1" strokeDasharray="4 4" />
            <line x1={x} y1={margin.top} x2={x} y2={height - margin.bottom} stroke="#f1e6d8" strokeDasharray="4 4" />
          </g>
        );
      })}

      <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#b89f87" />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#b89f87" />

      {data.map((item) => {
        const cx = scaleX(item.x);
        const cy = scaleY(item.y);
        const radius = scaleR(item.z);
        const color = item.highlight ? '#c8a96e' : chartColor(item.tone, '#6f9cd7');
        return (
          <g key={item.name}>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill={`${color}33`}
              stroke={color}
              strokeWidth={item.highlight ? 2.5 : 1.5}
              aria-label={`${item.name}: ${xLabel} ${item.x}, ${yLabel} ${item.y}, Share ${item.z}`}
            />
            <text x={cx} y={cy - radius - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#24190f">
              {item.name}
            </text>
          </g>
        );
      })}

      <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="11" fill="#7d6e60">
        {xLabel}
      </text>
      <text x={16} y={height / 2} textAnchor="middle" fontSize="11" fill="#7d6e60" transform={`rotate(-90 16 ${height / 2})`}>
        {yLabel}
      </text>
    </svg>
  );
}

function LineChartSvg({ series, yLabel }: { series: LineSeries[]; yLabel: string }) {
  const width = 480;
  const height = 280;
  const margin = { top: 20, right: 18, bottom: 48, left: 46 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const xLabels = series[0]?.points.map((point) => point.x) ?? [];
  const allValues = series.flatMap((entry) => entry.points.flatMap((point) => [point.low ?? point.y, point.y, point.high ?? point.y]));
  const yDomain = getNumericDomain(allValues, [0, 100]);

  const scaleX = (index: number) =>
    margin.left + (xLabels.length <= 1 ? chartWidth / 2 : (index / (xLabels.length - 1)) * chartWidth);
  const scaleY = (value: number) => margin.top + chartHeight - ((value - yDomain.min) / (yDomain.max - yDomain.min)) * chartHeight;

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {Array.from({ length: 5 }).map((_, index) => {
          const y = margin.top + (chartHeight / 4) * index;
          return <line key={index} x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#eadfd1" strokeDasharray="4 4" />;
        })}

        {series.map((entry) => {
          const color = entry.color || '#c8a96e';
          const upperPoints = entry.points.map((point, index) => ({ x: scaleX(index), y: scaleY(point.high ?? point.y) }));
          const lowerPoints = entry.points.map((point, index) => ({ x: scaleX(index), y: scaleY(point.low ?? point.y) }));
          const linePoints = entry.points.map((point, index) => ({ x: scaleX(index), y: scaleY(point.y) }));
          const hasBand = entry.points.some((point) => typeof point.low === 'number' || typeof point.high === 'number');
          return (
            <g key={entry.name}>
              {hasBand ? <path d={buildAreaPath(upperPoints, lowerPoints)} fill={`${color}20`} stroke="none" /> : null}
              <path d={buildLinearPath(linePoints)} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {linePoints.map((point, index) => (
                <circle
                  key={`${entry.name}-${xLabels[index]}`}
                  cx={point.x}
                  cy={point.y}
                  r="4.5"
                  fill={color}
                  aria-label={`${entry.name}: ${xLabels[index]} - ${entry.points[index]?.y}`}
                />
              ))}
            </g>
          );
        })}

        {xLabels.map((label, index) => (
          <text key={label} x={scaleX(index)} y={height - 12} textAnchor="middle" fontSize="10" fill="#7d6e60">
            {label}
          </text>
        ))}

        <text x={14} y={height / 2} textAnchor="middle" fontSize="11" fill="#7d6e60" transform={`rotate(-90 14 ${height / 2})`}>
          {yLabel}
        </text>
      </svg>

      <div className="flex flex-wrap gap-3">
        {series.map((entry) => (
          <div key={entry.name} className="inline-flex items-center gap-2 rounded-full border border-[#e4d6c4] bg-[#faf5ee] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f6152]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || '#c8a96e' }} />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarChartSvg({ data }: { data: RadarDatum[] }) {
  const size = 320;
  const center = size / 2;
  const radius = 104;
  const levels = 5;
  const maxValue = Math.max(100, ...data.map((item) => item.value));
  const angleStep = (Math.PI * 2) / Math.max(data.length, 1);

  const ringPoints = (level: number) =>
    data.map((_, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const ratio = level / levels;
      return {
        x: center + Math.cos(angle) * radius * ratio,
        y: center + Math.sin(angle) * radius * ratio,
      };
    });

  const valuePoints = data.map((item, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const ratio = clamp(item.value / maxValue, 0, 1);
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[320px]">
      {Array.from({ length: levels }).map((_, index) => (
        <polygon
          key={index}
          points={buildPolygonPoints(ringPoints(index + 1))}
          fill="none"
          stroke="#eadfd1"
          strokeDasharray="4 4"
        />
      ))}

      {data.map((item, index) => {
        const angle = -Math.PI / 2 + index * angleStep;
        const labelX = center + Math.cos(angle) * (radius + 22);
        const labelY = center + Math.sin(angle) * (radius + 22);
        return (
          <g key={item.label}>
            <line x1={center} y1={center} x2={labelX} y2={labelY} stroke="#e3d6c7" />
            <text x={labelX} y={labelY} textAnchor="middle" fontSize="11" fill="#7d6e60">
              {item.label}
            </text>
          </g>
        );
      })}

      <polygon points={buildPolygonPoints(valuePoints)} fill="#c8a96e22" stroke="#c8a96e" strokeWidth="2.5" />
      {valuePoints.map((point, index) => (
        <circle
          key={data[index]?.label}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="#c8a96e"
          aria-label={`${data[index]?.label}: ${data[index]?.value}`}
        />
      ))}
    </svg>
  );
}

export function ResearchModuleSkeleton({ title }: { title: string }) {
  return (
    <section className={PAPER_SECTION}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-4 w-20 animate-levitate-pulse rounded-full bg-[#eadfd1]" />
          <div className="mt-4 h-8 w-64 animate-levitate-pulse rounded-xl bg-[#eadfd1]" />
        </div>
        <div className="h-8 w-24 animate-levitate-pulse rounded-full bg-[#eadfd1]" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`${title}-${index}`} className={PAPER_PANEL}>
            <div className="h-3 w-24 animate-levitate-pulse rounded-full bg-[#eadfd1]" />
            <div className="mt-4 h-8 w-20 animate-levitate-pulse rounded-xl bg-[#eadfd1]" />
            <div className="mt-4 h-20 animate-levitate-pulse rounded-2xl bg-[#eadfd1]" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ResearchModuleRenderer({
  module,
  targetName,
  retryCountdownSeconds,
  compact = false,
}: {
  module: ResearchModuleResult;
  targetName?: string;
  retryCountdownSeconds?: number | null;
  compact?: boolean;
}) {
  const shouldTreatAsQueued =
    (module.status === 'pending' || module.status === 'loading') ||
    (module.status === 'failed' && isRecoverableResearchRateLimitMessage(module.error));

  if (shouldTreatAsQueued) {
    return <WaitingModuleCard title={module.title} retryCountdownSeconds={retryCountdownSeconds} />;
  }

  if (module.status === 'failed') {
    return (
      <section className={PAPER_SECTION}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#7d6e60]">Research module</div>
            <h2 className="mt-3 text-2xl font-bold text-[#24190f]">{module.title}</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses(module.status)}`}>
            Failed
          </span>
        </div>
        <p className="mt-5 text-sm leading-7 text-[#6f6152]">
          {module.error || 'This section could not be generated right now. You can retry by refreshing the report.'}
        </p>
      </section>
    );
  }

  const payload = normalizeResearchModulePayload(module.payload, targetName);
  if (!payload) {
    return null;
  }
  const moduleStructureFacts = [
    {
      label: 'Metrics',
      value: payload.metricCards?.length ?? 0,
    },
    {
      label: 'Visuals',
      value:
        (payload.donutCharts?.length ?? 0) +
        (payload.barCharts?.length ?? 0) +
        (payload.scatterPlots?.length ?? 0) +
        (payload.lineCharts?.length ?? 0) +
        (payload.radarCharts?.length ?? 0) +
        (payload.heatmaps?.length ?? 0),
    },
    {
      label: 'Decision blocks',
      value:
        (payload.cardGroups?.reduce((sum, group) => sum + group.cards.length, 0) ?? 0) +
        (payload.listSections?.reduce((sum, section) => sum + section.items.length, 0) ?? 0) +
        (payload.quadrants?.reduce((sum, quadrant) => sum + quadrant.items.length, 0) ?? 0),
    },
  ];
  const hasExtendedContent = Boolean(
    payload.progressMeters?.length ||
      payload.nestedRings ||
      payload.donutCharts?.length ||
      payload.barCharts?.length ||
      payload.scatterPlots?.length ||
      payload.lineCharts?.length ||
      payload.radarCharts?.length ||
      payload.tables?.length ||
      payload.cardGroups?.length ||
      payload.listSections?.length ||
      payload.quadrants?.length ||
      payload.heatmaps?.length ||
      payload.timelines?.length ||
      payload.callout
  );
  const extendedContent = (
    <>
      {payload.progressMeters?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.progressMeters.length, 2)}`}>
          {payload.progressMeters.map((meter) => (
            <div key={`${module.id}-${meter.label}`} className={PAPER_PANEL}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#24190f]">{meter.label}</div>
                <div className="text-sm font-bold text-[#9b6d2f]">{meter.value}%</div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#efe3d3]">
                <div className="h-full rounded-full bg-[#c8a96e]" style={{ width: `${clamp(meter.value, 0, 100)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-[#7d6e60]">
                <span>{meter.minLabel ?? 'Low'}</span>
                <span>{meter.maxLabel ?? 'High'}</span>
              </div>
              {meter.detail ? <div className="mt-3 text-sm leading-6 text-[#6f6152]">{meter.detail}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {payload.nestedRings ? (
        <div className={`mt-6 ${PAPER_PANEL_LG}`}>
          <div className="text-lg font-semibold text-[#24190f]">{payload.nestedRings.title}</div>
          <div className="mt-5">
            <ConcentricRings rings={payload.nestedRings.rings} />
          </div>
          {payload.nestedRings.footer ? <div className="mt-4 text-sm text-[#6f6152]">{payload.nestedRings.footer}</div> : null}
        </div>
      ) : null}

      {payload.donutCharts?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.donutCharts.length, 2)}`}>
          {payload.donutCharts.map((chart) => (
            <ChartShell
              key={`${module.id}-${chart.title}`}
              title={chart.title}
              className={payload.donutCharts!.length === 1 ? 'mx-auto w-full max-w-[720px]' : ''}
            >
              <DonutSvg data={chart.data} />
            </ChartShell>
          ))}
        </div>
      ) : null}

      {payload.barCharts?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.barCharts.length, 2)}`}>
          {payload.barCharts.map((chart) => (
            <ChartShell
              key={`${module.id}-${chart.title}`}
              title={chart.title}
              className={chart.orientation !== 'horizontal' && chart.data.length <= 4 ? 'mx-auto w-full max-w-[760px]' : ''}
            >
              <BarChartSvg data={chart.data} orientation={chart.orientation} />
            </ChartShell>
          ))}
        </div>
      ) : null}

      {payload.scatterPlots?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.scatterPlots.length, 2)}`}>
          {payload.scatterPlots.map((chart) => (
            <ChartShell key={`${module.id}-${chart.title}`} title={chart.title}>
              <ScatterPlotSvg data={chart.data} xLabel={chart.xLabel} yLabel={chart.yLabel} />
            </ChartShell>
          ))}
        </div>
      ) : null}

      {payload.lineCharts?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.lineCharts.length, 2)}`}>
          {payload.lineCharts.map((chart) => (
            <ChartShell key={`${module.id}-${chart.title}`} title={chart.title}>
              <LineChartSvg series={chart.series} yLabel={chart.yLabel} />
            </ChartShell>
          ))}
        </div>
      ) : null}

      {payload.radarCharts?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.radarCharts.length, 2)}`}>
          {payload.radarCharts.map((chart) => (
            <ChartShell
              key={`${module.id}-${chart.title}`}
              title={chart.title}
              className={payload.radarCharts!.length === 1 ? 'mx-auto w-full max-w-[620px]' : ''}
            >
              <RadarChartSvg data={chart.data as RadarDatum[]} />
            </ChartShell>
          ))}
        </div>
      ) : null}

      {payload.tables?.length ? (
        <div className="mt-6 space-y-4">
          {payload.tables.map((table) => (
            <div key={`${module.id}-${table.title}`} className="overflow-hidden rounded-2xl border border-[#e4d6c4] bg-[rgba(255,255,255,0.92)]">
              <div className="border-b border-[#e7d9c8] px-5 py-4 text-lg font-semibold text-[#24190f]">{table.title}</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-[#f7efe5]">
                    <tr>
                      {table.columns.map((column) => (
                        <th key={column.key} className="px-4 py-3 font-medium text-[#2f2217]">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.id} className="border-t border-[#eee3d6]">
                        {table.columns.map((column) => (
                          <td key={`${row.id}-${column.key}`} className="px-4 py-3 align-top text-[#2f2217]">
                            <span className={`rounded px-2 py-1 text-xs ${row.cells[column.key]?.tone ? toneClasses(row.cells[column.key]?.tone) : ''}`}>
                              {row.cells[column.key]?.value ?? '-'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {payload.cardGroups?.length ? (
        <div className="mt-6 space-y-4">
          {payload.cardGroups.map((group) => (
            <div key={`${module.id}-${group.title}`}>
              <div className="mb-3 text-lg font-semibold text-[#24190f]">{group.title}</div>
              <div className={`grid gap-4 ${getResponsiveGridClass(group.cards.length, Math.min(group.columns, 4))}`}>
                {group.cards.map((card) => (
                  <div key={`${group.title}-${card.title}`} className={PAPER_PANEL}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-[#24190f]">{card.title}</div>
                        {card.subtitle ? <div className="mt-1 text-sm text-[#706254]">{card.subtitle}</div> : null}
                      </div>
                      {card.badges?.length ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          {card.badges.map((badge) => (
                            <span key={`${card.title}-${badge.label}`} className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(badge.tone)}`}>
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {card.body ? <p className="mt-3 text-sm leading-6 text-[#706254]">{card.body}</p> : null}
                    {card.details?.length ? (
                      <div className="mt-4 space-y-2">
                        {card.details.map((detail) => (
                          <div key={`${card.title}-${detail.label}`} className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-[#7a6c5d]">{detail.label}</span>
                            <span className="text-right text-[#24190f]">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {payload.listSections?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.listSections.length, 3)}`}>
          {payload.listSections.map((section) => (
            <div key={`${module.id}-${section.title}`} className={PAPER_PANEL}>
              <div className="text-lg font-semibold text-[#24190f]">{section.title}</div>
              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.title}`} className="rounded-xl border border-[#e9dccd] bg-[rgba(250,245,238,0.86)] p-3">
                    <div className="text-sm font-semibold text-[#24190f]">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-[#706254]">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {payload.quadrants?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.quadrants.length, 2)}`}>
          {payload.quadrants.map((quadrant) => (
            <div key={`${module.id}-${quadrant.title}`} className={PAPER_PANEL}>
              <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses(quadrant.tone)}`}>
                {quadrant.title}
              </div>
              <div className="mt-4 space-y-3">
                {quadrant.items.map((item) => (
                  <div key={`${quadrant.title}-${item.title}`} className="rounded-xl border border-[#e9dccd] bg-[rgba(250,245,238,0.86)] p-3">
                    <div className="text-sm font-semibold text-[#24190f]">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-[#706254]">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {payload.heatmaps?.length ? (
        <div className="mt-6 space-y-4">
          {payload.heatmaps.map((heatmap) => (
            <div key={`${module.id}-${heatmap.title}`} className={PAPER_PANEL_LG}>
              <div className="text-lg font-semibold text-[#24190f]">{heatmap.title}</div>
              <div className="mt-4">
                <HeatmapGrid items={heatmap.items} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {payload.timelines?.length ? (
        <div className="mt-6 space-y-4">
          {payload.timelines.map((timeline) => (
            <div key={`${module.id}-${timeline.title}`} className={PAPER_PANEL_LG}>
              <div className="text-lg font-semibold text-[#24190f]">{timeline.title}</div>
              <div className={`mt-4 grid gap-3 ${getResponsiveGridClass(timeline.items.length, 4)}`}>
                {timeline.items.map((item) => (
                  <div key={`${timeline.title}-${item.label}`} className="rounded-xl border border-[#e9dccd] bg-[rgba(250,245,238,0.86)] p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-[#9a6d2d]">{item.start}</div>
                    <div className="mt-2 text-base font-semibold text-[#24190f]">{item.label}</div>
                    {item.detail ? <div className="mt-2 text-sm leading-6 text-[#706254]">{item.detail}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {payload.callout ? (
        <div className={`mt-6 rounded-2xl border px-5 py-4 ${toneClasses(payload.callout.tone)}`}>
          <div className="text-xs uppercase tracking-[0.18em]">Strategic Callout</div>
          <div className="mt-2 text-lg font-semibold">{payload.callout.title}</div>
          <div className="mt-2 text-sm leading-7 text-current/90">{payload.callout.body}</div>
        </div>
      ) : null}
    </>
  );

  const sectionClassName = compact
    ? 'rounded-[24px] border border-[#dccab5] bg-[#fffaf3] p-5 shadow-[0_16px_40px_rgba(73,48,19,0.07)]'
    : PAPER_SECTION;

  return (
    <section className={sectionClassName} id={module.id}>
      <div className={`flex flex-col lg:flex-row lg:items-start lg:justify-between ${compact ? 'gap-3.5' : 'gap-4'}`}>
        <div className="min-w-0 max-w-5xl">
          <div className="text-xs uppercase tracking-[0.22em] text-[#7d6e60]">Research module</div>
          <h2 className={`font-bold text-[#24190f] ${compact ? 'mt-2.5 text-[1.65rem]' : 'mt-3 text-2xl'}`}>{module.title}</h2>
          <p className={`text-sm text-[#6f6152] ${compact ? 'mt-2.5 leading-6' : 'mt-3 leading-7'}`}>{payload.summary}</p>
          {payload.chips?.length ? (
            <div className={`flex flex-wrap gap-2 ${compact ? 'mt-3' : 'mt-4'}`}>
              {payload.chips.map((chip) => (
                <span
                  key={`${module.id}-${chip.label}`}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClasses(chip.tone)}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ModuleScoreDial score={payload.score} compact={compact} />
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses(module.status)}`}
          >
            Complete
          </span>
        </div>
      </div>

      {!compact ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {moduleStructureFacts.map((fact) => (
            <div key={`${module.id}-${fact.label}`} className="rounded-[18px] border border-[#e4d6c4] bg-[rgba(255,255,255,0.92)] px-4 py-3 shadow-[0_12px_24px_rgba(73,48,19,0.04)]">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a7456]">{fact.label}</div>
              <div className="mt-2 text-lg font-bold text-[#24190f]">{fact.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {payload.metricCards?.length ? (
        <div className={`mt-6 grid gap-4 ${getResponsiveGridClass(payload.metricCards.length, 4)}`}>
          {payload.metricCards.map((card) => (
            <div key={`${module.id}-${card.label}`} className={PAPER_PANEL}>
              <div className="text-xs uppercase tracking-[0.18em] text-[#7d6e60]">{card.label}</div>
              <div className="mt-3 text-xl font-bold text-[#24190f]">{card.value}</div>
              {card.detail ? <div className="mt-2 text-sm leading-6 text-[#6f6152]">{card.detail}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
      {compact && hasExtendedContent ? (
        <details className="mt-4 rounded-[20px] border border-[#dccab5] bg-[rgba(255,255,255,0.92)] px-4 py-3 shadow-[0_12px_24px_rgba(73,48,19,0.04)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#2f2217] marker:content-none">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8f7757]">Detailed evidence</div>
              <div className="mt-1">Open charts, tables, and full module analysis</div>
            </div>
            <span className="rounded-full border border-[#d5bc95] bg-[#f8efde] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a6d2d]">
              Expand
            </span>
          </summary>
          <div className="mt-4 border-t border-[#eaded0] pt-4">{extendedContent}</div>
        </details>
      ) : (
        extendedContent
      )}
    </section>
  );
}
