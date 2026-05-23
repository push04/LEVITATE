type Tone = 'gold' | 'new' | 'progress' | 'closed';

const toneStyles: Record<Tone, { value: string; spark: string }> = {
  gold: { value: 'text-[var(--gold-base)]', spark: 'rgba(201,165,90,0.7)' },
  new: { value: 'text-[var(--text-primary)]', spark: 'rgba(100,130,200,0.7)' },
  progress: { value: 'text-blue-400', spark: 'rgba(96,165,250,0.7)' },
  closed: { value: 'text-emerald-400', spark: 'rgba(52,211,153,0.7)' },
};

interface Props {
  label: string;
  value: number | string;
  tone?: Tone;
  trend?: number[] | null;
  detail?: string;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts.join(' ')} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

export default function StatCard({ label, value, tone = 'new', trend, detail }: Props) {
  const { value: valueClass, spark } = toneStyles[tone];
  return (
    <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-5 flex flex-col gap-2">
      <div className="text-xs font-medium uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div>
      <div className={`font-data text-4xl leading-none ${valueClass}`}>{value}</div>
      {detail && <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{detail}</p>}
      {trend && trend.length > 1 && (
        <div className="mt-1">
          <Sparkline data={trend} color={spark} />
        </div>
      )}
    </div>
  );
}
