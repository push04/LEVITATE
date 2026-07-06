'use client';

import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus, TriangleAlert } from 'lucide-react';
import PriceChart from '@/components/market-pulse/PriceChart';
import {
  TechnicalVisuals,
  FundamentalsGrid,
  FindingsChecklist,
  RiskChecklist,
  PotentialRange,
  PredictionTrackerCard,
  TickerNewsList,
  type Fundamentals,
  type TechnicalMetrics,
  type Finding,
  type RiskFinding,
  type PredictionTracking,
  type TickerNewsItem,
} from '@/components/market-pulse/StockMetrics';

export type DigestCardData = {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  sentiment_trend: string;
  price_change_pct: number | null;
  trend_signal: string;
  summary_text: string;
  detailed_analysis: string | null;
  risk_notes: string | null;
  risk_level: string | null;
  insider_buy_count_30d: number | null;
  insider_sell_count_30d: number | null;
  fundamentals: Fundamentals | null;
  signal_findings?: Finding[] | null;
  risk_findings?: RiskFinding[] | null;
  prediction?: PredictionTracking | null;
  news?: TickerNewsItem[] | null;
} & TechnicalMetrics;

function formatPct(value: number | null) {
  if (value == null) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// A single word ("bullish"/"neutral") next to another single word reads as
// one ambiguous phrase ("Bullish Neutral Signal?") - every pill here carries
// an explicit source label so News vs. Technicals is never in question.
function SignalPill({ source, value }: { source: string; value: string }) {
  const tone =
    value === 'bullish' ? 'bullish' : value === 'bearish' ? 'bearish' : 'neutral';
  const Icon = tone === 'bullish' ? ArrowUpRight : tone === 'bearish' ? ArrowDownRight : Minus;
  const style =
    tone === 'bullish'
      ? 'border-[rgba(61,122,92,0.35)] bg-[rgba(61,122,92,0.1)] text-[var(--status-closed)]'
      : tone === 'bearish'
        ? 'border-[rgba(154,82,82,0.35)] bg-[rgba(154,82,82,0.1)] text-[#9a5252]'
        : 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-tertiary)]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${style}`}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="opacity-70">{source}</span>
      <span className="font-semibold capitalize">{value}</span>
    </span>
  );
}

function RiskBadge({ level }: { level: string | null }) {
  const style =
    level === 'elevated'
      ? 'border-[rgba(154,82,82,0.35)] bg-[rgba(154,82,82,0.1)] text-[#9a5252]'
      : level === 'low'
        ? 'border-[rgba(61,122,92,0.35)] bg-[rgba(61,122,92,0.1)] text-[var(--status-closed)]'
        : 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-tertiary)]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style}`}>
      {level === 'elevated' && <TriangleAlert className="h-3 w-3" />}
      {level ?? 'moderate'} risk
    </span>
  );
}

const ACCENT_BY_SIGNAL: Record<string, string> = {
  bullish: 'var(--status-closed)',
  bearish: '#9a5252',
  neutral: 'var(--border-strong)',
};

export default function DigestCard({
  d,
  priceEndpoint,
  highlighted,
}: {
  d: DigestCardData;
  priceEndpoint: string;
  highlighted?: boolean;
}) {
  const accent = ACCENT_BY_SIGNAL[d.trend_signal] ?? ACCENT_BY_SIGNAL.neutral;
  const priceTone =
    d.price_change_pct != null && d.price_change_pct > 0
      ? 'text-[var(--status-closed)]'
      : d.price_change_pct != null && d.price_change_pct < 0
        ? 'text-[#9a5252]'
        : 'text-[var(--text-secondary)]';

  return (
    <details
      className={`group overflow-hidden rounded-[16px] border transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
        highlighted ? 'border-[var(--border-strong)] bg-[var(--gold-glow)]' : 'border-[var(--border-default)] bg-[var(--bg-elevated)]'
      }`}
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="type-heading truncate text-[var(--text-primary)]">{d.company_name ?? d.ticker}</div>
            <div className="type-caption text-[var(--text-tertiary)]">
              {d.ticker}
              {d.sector ? ` · ${d.sector}` : ''}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`type-heading whitespace-nowrap ${priceTone}`}>{formatPct(d.price_change_pct)}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 group-open:rotate-180" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SignalPill source="News" value={d.sentiment_trend} />
          <SignalPill source="Technicals" value={d.trend_signal} />
          <RiskBadge level={d.risk_level} />
        </div>
      </summary>

      <div className="border-t border-[var(--border-default)] p-4 sm:p-5">
        <p className="type-body text-[var(--text-secondary)]">{d.summary_text}</p>
        <div className="mt-4 overflow-hidden rounded-[10px] bg-[var(--bg-overlay)] p-3">
          <PriceChart ticker={d.ticker} priceEndpoint={priceEndpoint} />
        </div>
        {d.prediction && (
          <div className="mt-4">
            <PredictionTrackerCard prediction={d.prediction} currentPrice={d.current_price} />
          </div>
        )}
        <div className="mt-4">
          <TechnicalVisuals m={d} />
        </div>
        <div className="mt-4">
          <PotentialRange currentPrice={d.current_price} atr14={d.atr_14} />
        </div>
        {d.signal_findings && d.signal_findings.length > 0 ? (
          <div className="mt-4">
            <FindingsChecklist findings={d.signal_findings} />
          </div>
        ) : (
          d.detailed_analysis && (
            <div className="mt-4">
              <div className="type-subheading text-[var(--text-tertiary)]">Technical read</div>
              <p className="mt-1.5 type-body text-[var(--text-secondary)]">{d.detailed_analysis}</p>
            </div>
          )
        )}
        {d.risk_findings && d.risk_findings.length > 0 ? (
          <div className="mt-4">
            <RiskChecklist findings={d.risk_findings} />
          </div>
        ) : (
          d.risk_notes && <p className="mt-3 type-caption leading-5">{d.risk_notes}</p>
        )}
        {d.fundamentals && (
          <div className="mt-4">
            <FundamentalsGrid f={d.fundamentals} currentPrice={d.current_price} />
          </div>
        )}
        {d.news && d.news.length > 0 && (
          <div className="mt-4">
            <TickerNewsList items={d.news} />
          </div>
        )}
        {((d.insider_buy_count_30d ?? 0) > 0 || (d.insider_sell_count_30d ?? 0) > 0) && (
          <div className="mt-3 type-caption text-[var(--text-tertiary)]">
            Insider filings (30d): {d.insider_buy_count_30d ?? 0} buy / {d.insider_sell_count_30d ?? 0} sell
          </div>
        )}
      </div>
    </details>
  );
}
