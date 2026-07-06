import { CheckCircle2, XCircle, MinusCircle, TriangleAlert, LineChart, Wallet, ListChecks, CalendarClock, Gauge, Newspaper, ExternalLink } from 'lucide-react';
import { formatIndianDate } from '@/lib/date-format';

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
        <div className="absolute top-0 h-full w-[3px] bg-[var(--text-primary)]" style={{ left: `calc(${pct}% - 1.5px)` }} />
      </div>
    </div>
  );
}

// Where today's close sits between the 52-week low and high - a single bar
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
    tone === 'bullish' ? 'text-[var(--status-closed)]' : tone === 'bearish' ? 'text-[#9a5252]' : 'text-[var(--text-primary)]';
  return (
    <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2">
      <div className="type-caption text-[var(--text-tertiary)]">{label}</div>
      <div className={`mt-0.5 type-body font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 type-subheading text-[var(--text-tertiary)]">
      <Icon className="h-3.5 w-3.5" />
      {label}
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
      <SectionHeader icon={LineChart} label="Technicals at a glance" />
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

export type Finding = { text: string; tone: 'bullish' | 'bearish' | 'neutral' };
export type RiskFinding = { text: string; severity: 'high' | 'medium' };

// The deterministic engine's reasoning as a scannable checklist - one icon
// + line per signal - instead of a single run-on paragraph that reads the
// same regardless of what it's actually saying.
export function FindingsChecklist({ findings }: { findings: Finding[] | null | undefined }) {
  if (!findings || findings.length === 0) return null;

  return (
    <div>
      <SectionHeader icon={ListChecks} label="Technical read" />
      <ul className="mt-2 space-y-1.5">
        {findings.map((f, i) => {
          const Icon = f.tone === 'bullish' ? CheckCircle2 : f.tone === 'bearish' ? XCircle : MinusCircle;
          const colorClass = f.tone === 'bullish' ? 'text-[var(--status-closed)]' : f.tone === 'bearish' ? 'text-[#9a5252]' : 'text-[var(--text-tertiary)]';
          return (
            <li key={i} className="flex items-start gap-2 type-body text-[var(--text-secondary)]">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`} />
              <span>{f.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RiskChecklist({ findings }: { findings: RiskFinding[] | null | undefined }) {
  if (!findings || findings.length === 0) return null;

  return (
    <div>
      <SectionHeader icon={TriangleAlert} label="Risk notes" />
      <ul className="mt-2 space-y-1.5">
        {findings.map((f, i) => (
          <li key={i} className="flex items-start gap-2 type-caption leading-5">
            <TriangleAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${f.severity === 'high' ? 'text-[#9a5252]' : 'text-[var(--gold-base)]'}`} />
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
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
  beta: number | null;
};

function pctStat(label: string, value: number | null) {
  if (value == null) return null;
  return <StatChip key={label} label={label} value={`${(value * 100).toFixed(1)}%`} tone={value >= 0 ? 'bullish' : 'bearish'} />;
}

export function FundamentalsGrid({ f, currentPrice }: { f: Fundamentals; currentPrice: number | null }) {
  const hasValuation = f.pe_forward != null || f.debt_to_equity != null || f.beta != null;
  const hasPerformance = f.return_on_equity != null || f.revenue_growth != null || f.earnings_growth != null || f.profit_margin != null;
  const hasAnalyst = f.analyst_target_mean_price != null || f.analyst_recommendation_key != null;
  if (!hasValuation && !hasPerformance && !hasAnalyst) return null;

  const upside = currentPrice && f.analyst_target_mean_price ? ((f.analyst_target_mean_price - currentPrice) / currentPrice) * 100 : null;

  return (
    <div className="space-y-4">
      <SectionHeader icon={Wallet} label="Fundamentals" />

      {hasValuation && (
        <div>
          <div className="type-caption text-[var(--text-tertiary)]">Valuation</div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {f.pe_forward != null && <StatChip label="Forward P/E" value={f.pe_forward.toFixed(1)} />}
            {f.debt_to_equity != null && <StatChip label="Debt/Equity" value={f.debt_to_equity.toFixed(1)} />}
            {f.beta != null && <StatChip label="Beta (vs market)" value={f.beta.toFixed(2)} />}
          </div>
        </div>
      )}

      {hasPerformance && (
        <div>
          <div className="type-caption text-[var(--text-tertiary)]">Profitability &amp; growth</div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pctStat('Return on equity', f.return_on_equity)}
            {pctStat('Revenue growth', f.revenue_growth)}
            {pctStat('Earnings growth', f.earnings_growth)}
            {pctStat('Profit margin', f.profit_margin)}
          </div>
        </div>
      )}

      {hasAnalyst && (
        <div>
          <div className="type-caption text-[var(--text-tertiary)]">Analyst view</div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {f.analyst_target_mean_price != null && (
              <StatChip
                label={`Target price${f.number_of_analyst_opinions ? ` (${f.number_of_analyst_opinions} analysts)` : ''}`}
                value={`₹${f.analyst_target_mean_price.toFixed(0)}${upside != null ? ` (${upside > 0 ? '+' : ''}${upside.toFixed(0)}%)` : ''}`}
                tone={upside != null ? (upside >= 0 ? 'bullish' : 'bearish') : undefined}
              />
            )}
            {f.analyst_recommendation_key && <StatChip label="Consensus" value={f.analyst_recommendation_key.replace(/_/g, ' ')} />}
          </div>
        </div>
      )}
    </div>
  );
}

// Volatility-scaled expected move, NOT a directional forecast - how far this
// stock has typically moved historically, scaled from its daily ATR to the
// prediction horizon via the standard sqrt(time) rule (independent daily
// moves compound as sqrt(n), not n). Framed as "how much could this swing",
// distinct from the bullish/bearish signal itself.
export function PotentialRange({ currentPrice, atr14, horizonDays = 7 }: { currentPrice: number | null; atr14: number | null; horizonDays?: number }) {
  if (currentPrice == null || atr14 == null || currentPrice <= 0) return null;
  const dailyAtrPct = (atr14 / currentPrice) * 100;
  const expectedMovePct = dailyAtrPct * Math.sqrt(horizonDays);
  const upper = currentPrice * (1 + expectedMovePct / 100);
  const lower = currentPrice * (1 - expectedMovePct / 100);

  return (
    <div>
      <SectionHeader icon={Gauge} label={`${horizonDays}-day potential (volatility-based)`} />
      <p className="mt-1 type-caption text-[var(--text-tertiary)]">
        Not a forecast of direction - how far this stock has typically swung, scaled from its recent daily volatility (ATR).
      </p>
      <div className="mt-2 flex items-center justify-between rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2.5">
        <span className="type-body font-semibold text-[#9a5252]">₹{lower.toFixed(2)}</span>
        <span className="type-caption text-[var(--text-tertiary)]">±{expectedMovePct.toFixed(1)}%</span>
        <span className="type-body font-semibold text-[var(--status-closed)]">₹{upper.toFixed(2)}</span>
      </div>
    </div>
  );
}

export type PredictionTracking = {
  predictionDate: string;
  signal: string;
  priceAtPrediction: number;
  targetDate: string;
  evaluated: boolean;
  outcome: string | null;
  priceChangePct: number | null;
  accuracy: { correct: number; total: number; pct: number | null };
};

// The requested accountability view: WHEN was this called, and - checked
// against the real price, whether the target date has arrived yet or not -
// is it actually tracking that call so far. Distinct from the site-wide
// track record (Track record section): this is this ticker's own history.
export function PredictionTrackerCard({ prediction, currentPrice }: { prediction: PredictionTracking | null; currentPrice: number | null }) {
  if (!prediction) return null;

  const livePct =
    currentPrice != null ? Math.round(((currentPrice - prediction.priceAtPrediction) / prediction.priceAtPrediction) * 10000) / 100 : null;
  const displayPct = prediction.evaluated ? prediction.priceChangePct : livePct;

  const daysElapsed = Math.round((Date.now() - new Date(prediction.predictionDate).getTime()) / (24 * 60 * 60 * 1000));

  let statusLabel: string;
  let statusTone: 'bullish' | 'bearish' | 'neutral';
  if (prediction.evaluated) {
    statusLabel = prediction.outcome === 'correct' ? 'Correct' : prediction.outcome === 'incorrect' ? 'Incorrect' : 'Inconclusive';
    statusTone = prediction.outcome === 'correct' ? 'bullish' : prediction.outcome === 'incorrect' ? 'bearish' : 'neutral';
  } else {
    // Not evaluated yet - infer whether it's currently tracking the call,
    // using the same directional logic as evaluate_predictions.ts, just
    // provisionally (this can still flip before the target date arrives).
    const directionalThreshold = 1;
    if (prediction.signal === 'bullish') statusTone = livePct != null && livePct > directionalThreshold ? 'bullish' : livePct != null && livePct < -directionalThreshold ? 'bearish' : 'neutral';
    else if (prediction.signal === 'bearish') statusTone = livePct != null && livePct < -directionalThreshold ? 'bullish' : livePct != null && livePct > directionalThreshold ? 'bearish' : 'neutral';
    else statusTone = livePct != null && Math.abs(livePct) <= 2 ? 'bullish' : 'bearish';
    statusLabel = statusTone === 'bullish' ? 'Tracking so far' : statusTone === 'bearish' ? 'Against so far' : 'Too early to tell';
  }

  const toneClass = statusTone === 'bullish' ? 'text-[var(--status-closed)]' : statusTone === 'bearish' ? 'text-[#9a5252]' : 'text-[var(--text-tertiary)]';

  return (
    <div>
      <SectionHeader icon={CalendarClock} label="Prediction tracking" />
      <div className="mt-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3">
        <div className="type-caption text-[var(--text-tertiary)]">
          Called <span className="font-semibold capitalize text-[var(--text-primary)]">{prediction.signal}</span> on {formatIndianDate(prediction.predictionDate)}
          {' · '}
          {prediction.evaluated ? `checked on ${formatIndianDate(prediction.targetDate)}` : `${daysElapsed} day${daysElapsed === 1 ? '' : 's'} in, targets ${formatIndianDate(prediction.targetDate)}`}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className={`type-heading font-semibold ${toneClass}`}>{statusLabel}</span>
          {displayPct != null && (
            <span className={`type-body ${toneClass}`}>
              {displayPct > 0 ? '+' : ''}
              {displayPct.toFixed(2)}% since prediction
            </span>
          )}
        </div>
        {prediction.accuracy.total > 0 && (
          <div className="mt-1.5 type-caption text-[var(--text-tertiary)]">
            This stock&rsquo;s track record: {prediction.accuracy.correct} of {prediction.accuracy.total} calls correct ({prediction.accuracy.pct}%)
          </div>
        )}
      </div>
    </div>
  );
}

export type TickerNewsItem = {
  title: string;
  link: string | null;
  source: string | null;
  sentiment: string;
  confidence: number;
  summary: string;
  publishedAt: string | null;
};

// The "why" behind the News pill's sentiment - the actual headlines and an
// AI-condensed one-line summary of each, not just a bare "bullish" tag.
export function TickerNewsList({ items }: { items: TickerNewsItem[] | null | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <SectionHeader icon={Newspaper} label="Recent news for this stock" />
      <ul className="mt-2 space-y-2.5">
        {items.map((item, i) => {
          const toneClass =
            item.sentiment === 'bullish' ? 'text-[var(--status-closed)]' : item.sentiment === 'bearish' ? 'text-[#9a5252]' : 'text-[var(--text-tertiary)]';
          return (
            <li key={i} className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="type-body text-[var(--text-secondary)]">{item.summary}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-accent)]">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 type-caption text-[var(--text-tertiary)]">
                {item.source && <span className="uppercase">{item.source}</span>}
                <span className={`capitalize font-medium ${toneClass}`}>{item.sentiment}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
