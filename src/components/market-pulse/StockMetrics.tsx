type Zone = { upto: number; color: string; label?: string };

// A horizontal 0-100%-mapped bar with colored zones (oversold/neutral/
// overbought style) and a marker at the current value. Used for any
// oscillator with a fixed range (RSI, Stochastic, CCI, Williams %R).
function OscillatorBar({
  label,
  value,
  min,
  max,
  zones,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  zones: Zone[];
}) {
  if (value == null) return null;
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="type-caption text-[var(--text-tertiary)]">{label}</span>
        <span className="type-caption font-semibold text-[var(--text-primary)]">{value.toFixed(1)}</span>
      </div>
      <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--bg-overlay)]">
        {zones.map((z, i) => {
          const prevUpto = i === 0 ? min : zones[i - 1].upto;
          const left = ((prevUpto - min) / (max - min)) * 100;
          const width = ((z.upto - prevUpto) / (max - min)) * 100;
          return <div key={i} className="absolute top-0 h-full" style={{ left: `${left}%`, width: `${width}%`, background: z.color }} />;
        })}
        <div
          className="absolute top-0 h-full w-[3px] bg-[var(--text-primary)]"
          style={{ left: `calc(${pct}% - 1.5px)` }}
        />
      </div>
    </div>
  );
}

// Where today's close sits between the 52-week low and high — a single bar
// with a marker, instead of two disconnected numbers.
function RangeBar({ current, low, high }: { current: number | null; low: number | null; high: number | null }) {
  if (current == null || low == null || high == null || high <= low) return null;
  const pct = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="type-caption text-[var(--text-tertiary)]">52-week range</span>
        <span className="type-caption font-semibold text-[var(--text-primary)]">₹{current.toFixed(2)}</span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-[linear-gradient(90deg,rgba(154,82,82,0.35),rgba(176,141,87,0.35),rgba(61,122,92,0.35))]">
        <div className="absolute top-0 h-full w-[3px] bg-[var(--text-primary)]" style={{ left: `calc(${pct}% - 1.5px)` }} />
      </div>
      <div className="mt-1 flex justify-between type-caption text-[var(--text-tertiary)]">
        <span>₹{low.toFixed(2)}</span>
        <span>₹{high.toFixed(2)}</span>
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: 'bullish' | 'bearish' | 'neutral' }) {
  const toneClass =
    tone === 'bullish'
      ? 'text-[var(--status-closed)]'
      : tone === 'bearish'
        ? 'text-[#9a5252]'
        : 'text-[var(--text-primary)]';
  return (
    <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2">
      <div className="type-caption text-[var(--text-tertiary)]">{label}</div>
      <div className={`mt-0.5 type-body font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

export type TechnicalMetrics = {
  current_price: number | null;
  macd: number | null;
  macd_signal: number | null;
  sma_20: number | null;
  sma_50: number | null;
  adx_14: number | null;
  atr_14: number | null;
  rsi_14: number | null;
  stoch_k: number | null;
  cci_20: number | null;
  williams_r_14: number | null;
  volume: number | null;
  avg_volume_20: number | null;
  high_52w: number | null;
  low_52w: number | null;
};

export function TechnicalVisuals({ m }: { m: TechnicalMetrics }) {
  const hasOscillators = m.rsi_14 != null || m.stoch_k != null || m.cci_20 != null || m.williams_r_14 != null;
  const hasRange = m.current_price != null && m.high_52w != null && m.low_52w != null;
  const macdBullish = m.macd != null && m.macd_signal != null ? m.macd > m.macd_signal : null;
  const trendStructure =
    m.current_price != null && m.sma_20 != null && m.sma_50 != null
      ? m.current_price > m.sma_20 && m.current_price > m.sma_50
        ? 'bullish'
        : m.current_price < m.sma_20 && m.current_price < m.sma_50
          ? 'bearish'
          : 'neutral'
      : null;
  const volumeRatio = m.volume != null && m.avg_volume_20 ? m.volume / m.avg_volume_20 : null;

  if (!hasOscillators && !hasRange && macdBullish == null && volumeRatio == null) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {macdBullish != null && (
          <StatChip label="MACD" value={macdBullish ? 'Bullish cross' : 'Bearish cross'} tone={macdBullish ? 'bullish' : 'bearish'} />
        )}
        {m.adx_14 != null && (
          <StatChip label="ADX (trend strength)" value={`${m.adx_14.toFixed(0)}${m.adx_14 >= 40 ? ' · strong' : m.adx_14 < 20 ? ' · weak' : ''}`} />
        )}
        {trendStructure && (
          <StatChip label="MA structure" value={trendStructure === 'bullish' ? 'Above 20/50-day' : trendStructure === 'bearish' ? 'Below 20/50-day' : 'Mixed'} tone={trendStructure} />
        )}
        {m.atr_14 != null && m.current_price && (
          <StatChip label="Volatility (ATR)" value={`${((m.atr_14 / m.current_price) * 100).toFixed(1)}%`} />
        )}
        {volumeRatio != null && (
          <StatChip label="Volume vs 20d avg" value={`${volumeRatio.toFixed(1)}x`} tone={volumeRatio >= 1.8 ? 'bearish' : undefined} />
        )}
      </div>

      {hasOscillators && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OscillatorBar
            label="RSI (14)"
            value={m.rsi_14}
            min={0}
            max={100}
            zones={[
              { upto: 30, color: 'rgba(61,122,92,0.5)' },
              { upto: 70, color: 'rgba(176,141,87,0.25)' },
              { upto: 100, color: 'rgba(154,82,82,0.5)' },
            ]}
          />
          <OscillatorBar
            label="Stochastic %K"
            value={m.stoch_k}
            min={0}
            max={100}
            zones={[
              { upto: 20, color: 'rgba(61,122,92,0.5)' },
              { upto: 80, color: 'rgba(176,141,87,0.25)' },
              { upto: 100, color: 'rgba(154,82,82,0.5)' },
            ]}
          />
          <OscillatorBar
            label="CCI (20)"
            value={m.cci_20}
            min={-200}
            max={200}
            zones={[
              { upto: -100, color: 'rgba(61,122,92,0.5)' },
              { upto: 100, color: 'rgba(176,141,87,0.25)' },
              { upto: 200, color: 'rgba(154,82,82,0.5)' },
            ]}
          />
          <OscillatorBar
            label="Williams %R"
            value={m.williams_r_14}
            min={-100}
            max={0}
            zones={[
              { upto: -80, color: 'rgba(61,122,92,0.5)' },
              { upto: -20, color: 'rgba(176,141,87,0.25)' },
              { upto: 0, color: 'rgba(154,82,82,0.5)' },
            ]}
          />
        </div>
      )}

      {hasRange && <RangeBar current={m.current_price} low={m.low_52w} high={m.high_52w} />}
    </div>
  );
}

export type Fundamentals = {
  pe_forward: number | null;
  return_on_equity: number | null;
  return_on_assets: number | null;
  debt_to_equity: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
  profit_margin: number | null;
  analyst_target_mean_price: number | null;
  analyst_recommendation_key: string | null;
  number_of_analyst_opinions: number | null;
};

function pctStat(label: string, value: number | null) {
  if (value == null) return null;
  return <StatChip key={label} label={label} value={`${(value * 100).toFixed(1)}%`} tone={value >= 0 ? 'bullish' : 'bearish'} />;
}

export function FundamentalsGrid({ f, currentPrice }: { f: Fundamentals; currentPrice: number | null }) {
  const hasAny =
    f.pe_forward != null ||
    f.return_on_equity != null ||
    f.debt_to_equity != null ||
    f.revenue_growth != null ||
    f.earnings_growth != null ||
    f.profit_margin != null ||
    f.analyst_target_mean_price != null;
  if (!hasAny) return null;

  const upside = currentPrice && f.analyst_target_mean_price ? ((f.analyst_target_mean_price - currentPrice) / currentPrice) * 100 : null;

  return (
    <div>
      <div className="type-subheading text-[var(--text-tertiary)]">Fundamentals</div>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {f.pe_forward != null && <StatChip label="Forward P/E" value={f.pe_forward.toFixed(1)} />}
        {pctStat('Return on equity', f.return_on_equity)}
        {pctStat('Revenue growth', f.revenue_growth)}
        {pctStat('Earnings growth', f.earnings_growth)}
        {pctStat('Profit margin', f.profit_margin)}
        {f.debt_to_equity != null && <StatChip label="Debt/Equity" value={f.debt_to_equity.toFixed(1)} />}
        {f.analyst_target_mean_price != null && (
          <StatChip
            label={`Analyst target${f.number_of_analyst_opinions ? ` (${f.number_of_analyst_opinions})` : ''}`}
            value={`₹${f.analyst_target_mean_price.toFixed(0)}${upside != null ? ` (${upside > 0 ? '+' : ''}${upside.toFixed(0)}%)` : ''}`}
            tone={upside != null ? (upside >= 0 ? 'bullish' : 'bearish') : undefined}
          />
        )}
        {f.analyst_recommendation_key && (
          <StatChip label="Analyst consensus" value={f.analyst_recommendation_key.replace(/_/g, ' ')} />
        )}
      </div>
    </div>
  );
}
