'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, TrendingDown, TrendingUp, Minus, TriangleAlert } from 'lucide-react';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import PriceChart from '@/components/market-pulse/PriceChart';

interface DigestRow {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  sentiment_trend: string;
  avg_confidence: number;
  news_count: number;
  price_change_pct: number | null;
  rsi_14: number | null;
  trend_signal: string;
  divergence_flag: boolean;
  summary_text: string;
  detailed_analysis: string | null;
  risk_notes: string | null;
  risk_level: string | null;
}

interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  published_at: string | null;
  sentiment: { ticker: string | null; sentiment: string; confidence: number; summary: string } | null;
}

interface TrackRecord {
  live: { total: number; correct: number; accuracyPct: number | null };
  backtest: {
    run_at: string;
    target_days: number;
    total_signals: number;
    overall_accuracy_pct: number | null;
  } | null;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const style =
    sentiment === 'bullish'
      ? 'bg-[rgba(61,122,92,0.15)] text-[var(--status-closed)] border-[rgba(61,122,92,0.35)]'
      : sentiment === 'bearish'
        ? 'bg-[rgba(171,80,80,0.15)] text-[#c97a7a] border-[rgba(171,80,80,0.35)]'
        : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)] border-[var(--border-default)]';
  const Icon = sentiment === 'bullish' ? TrendingUp : sentiment === 'bearish' ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style}`}>
      <Icon className="h-3 w-3" />
      {sentiment}
    </span>
  );
}

function RiskBadge({ level }: { level: string | null }) {
  const style =
    level === 'elevated'
      ? 'border-[rgba(171,80,80,0.35)] bg-[rgba(171,80,80,0.1)] text-[#c97a7a]'
      : level === 'low'
        ? 'border-[rgba(61,122,92,0.35)] bg-[rgba(61,122,92,0.1)] text-[var(--status-closed)]'
        : 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-tertiary)]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}>
      {level === 'elevated' && <TriangleAlert className="h-3 w-3" />}
      {level ?? 'moderate'} risk
    </span>
  );
}

function DigestCard({ d }: { d: DigestRow }) {
  return (
    <details className="group rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2.5 p-4">
        <span className="font-medium text-[var(--text-primary)]">{d.company_name ?? d.ticker}</span>
        <span className="type-caption text-[var(--text-tertiary)]">{d.ticker}{d.sector ? ` · ${d.sector}` : ''}</span>
        <SentimentBadge sentiment={d.sentiment_trend} />
        <span className={`font-medium ${d.price_change_pct != null && d.price_change_pct > 0 ? 'text-[var(--status-closed)]' : d.price_change_pct != null && d.price_change_pct < 0 ? 'text-[#c97a7a]' : 'text-[var(--text-secondary)]'}`}>
          {d.price_change_pct != null ? `${d.price_change_pct > 0 ? '+' : ''}${d.price_change_pct.toFixed(2)}%` : '—'}
        </span>
        <span className="type-caption capitalize text-[var(--text-tertiary)]">{d.trend_signal} signal</span>
        <RiskBadge level={d.risk_level} />
        <span className="ml-auto type-caption text-[var(--gold-base)] group-open:hidden">Expand</span>
        <span className="ml-auto hidden type-caption text-[var(--gold-base)] group-open:inline">Collapse</span>
      </summary>
      <div className="border-t border-[var(--border-default)] p-4">
        <div className="rounded-[10px] bg-[var(--bg-overlay)] p-3">
          <PriceChart ticker={d.ticker} priceEndpoint="/api/business/market-pulse/prices" />
        </div>
        {d.detailed_analysis && (
          <div className="mt-4">
            <div className="type-subheading text-[var(--text-tertiary)]">Technical read</div>
            <p className="mt-1.5 type-body text-[var(--text-secondary)]">{d.detailed_analysis}</p>
          </div>
        )}
        {d.risk_notes && <p className="mt-3 type-caption leading-5">{d.risk_notes}</p>}
      </div>
    </details>
  );
}

export default function MarketPulseWorkspace() {
  const [digest, setDigest] = useState<DigestRow[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [digestDate, setDigestDate] = useState<string | null>(null);
  const [trackRecord, setTrackRecord] = useState<TrackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/business/market-pulse');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load Market Pulse');
        setDigest(json.digest ?? []);
        setNews(json.news ?? []);
        setDigestDate(json.digestDate ?? null);
        setTrackRecord(json.trackRecord ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Market Pulse');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const divergences = digest.filter((d) => d.divergence_flag);
  const rest = digest.filter((d) => !d.divergence_flag);

  return (
    <div className="space-y-6">
      <div className={`${styles.panel} p-6 md:p-8`}>
        <div className="type-subheading text-[var(--text-tertiary)]">Market Pulse</div>
        <h1 className="mt-3 type-hero text-[var(--text-primary)]">Where the market's attention is today</h1>
        <p className="mt-3 max-w-3xl type-body text-[var(--text-secondary)]">
          Daily Indian (NSE/BSE) stock market sentiment, price movement, and technicals for a
          watchlist chosen fresh every day from real market movers and news coverage — a starting
          point for thinking about where surplus business cash might go, not a recommendation.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3 text-[12px] leading-5 text-[var(--text-tertiary)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold-base)]" />
          <span>
            Informational only — not investment advice. The technical read and risk notes are
            generated by a deterministic rules engine from real price/indicator data (RSI, MACD,
            moving averages, Bollinger Bands, ATR); sentiment tags come from AI classification of
            public news and can be wrong. Please do your own research or consult a
            SEBI-registered advisor before investing.
          </span>
        </div>
        {digestDate && (
          <div className="mt-3 type-caption text-[var(--text-tertiary)]">Last updated: {digestDate}</div>
        )}
      </div>

      {trackRecord && (trackRecord.live.total > 0 || trackRecord.backtest) && (
        <div className={`${styles.panel} p-6`}>
          <div className="type-subheading text-[var(--text-tertiary)]">Track record</div>
          <p className="mt-1 type-caption text-[var(--text-tertiary)]">
            Every bullish/bearish/neutral call is recorded and auto-graded against the real price
            seven trading days later — nothing is asserted without being checked.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-4">
              <div className="type-caption text-[var(--text-tertiary)]">Live predictions, evaluated</div>
              <div className="mt-1 type-hero text-[var(--text-primary)]">
                {trackRecord.live.accuracyPct != null ? `${trackRecord.live.accuracyPct}%` : '—'}
              </div>
              <div className="mt-1 type-caption text-[var(--text-tertiary)]">
                {trackRecord.live.total > 0
                  ? `${trackRecord.live.correct} of ${trackRecord.live.total} correct so far`
                  : 'None matured yet'}
              </div>
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-4">
              <div className="type-caption text-[var(--text-tertiary)]">Backtested against history</div>
              <div className="mt-1 type-hero text-[var(--text-primary)]">
                {trackRecord.backtest?.overall_accuracy_pct != null ? `${trackRecord.backtest.overall_accuracy_pct}%` : '—'}
              </div>
              <div className="mt-1 type-caption text-[var(--text-tertiary)]">
                {trackRecord.backtest
                  ? `${trackRecord.backtest.total_signals} historical signals re-checked`
                  : 'Backtest has not run yet'}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={`${styles.panel} p-12 text-center text-[var(--text-tertiary)]`}>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--gold-base)]" />
          <div className="mt-4">Loading Market Pulse…</div>
        </div>
      ) : error ? (
        <div className={`${styles.panel} p-6 text-[#c97a7a]`}>{error}</div>
      ) : digest.length === 0 ? (
        <div className={`${styles.panel} p-8 text-center text-[var(--text-tertiary)]`}>
          No digest yet — the daily scraper hasn't run for this workspace yet. Check back tomorrow morning.
        </div>
      ) : (
        <>
          {divergences.length > 0 && (
            <div className={`${styles.panel} p-6`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Worth a second look</div>
              <p className="mt-1 type-caption text-[var(--text-tertiary)]">
                Sentiment and price are moving in opposite directions — the market may not have caught up yet, or the news reaction is overdone.
              </p>
              <div className="mt-4 space-y-3">
                {divergences.map((d) => <DigestCard key={d.ticker} d={d} />)}
              </div>
            </div>
          )}

          <div className={`${styles.panel} p-6`}>
            <div className="type-subheading text-[var(--text-tertiary)]">Today's watchlist</div>
            <p className="mt-1 type-caption text-[var(--text-tertiary)]">
              Selected fresh today from real price movement (top gainers, losers, most-active) and
              news trends — not a fixed list.
            </p>
            <div className="mt-4 space-y-3">
              {rest.map((d) => <DigestCard key={d.ticker} d={d} />)}
            </div>
          </div>

          {news.length > 0 && (
            <div className={`${styles.panel} p-6`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Recent market news</div>
              <div className="mt-4 space-y-3">
                {news.map((n) => (
                  <a
                    key={n.id}
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-3 rounded-[10px] border border-[var(--border-default)] p-3 transition-colors hover:bg-[var(--bg-overlay)]"
                  >
                    <div className="min-w-0">
                      <div className="type-body text-[var(--text-primary)]">{n.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 type-caption text-[var(--text-tertiary)]">
                        <span className="uppercase">{n.source}</span>
                        {n.sentiment && <SentimentBadge sentiment={n.sentiment.sentiment} />}
                        {n.sentiment?.ticker && <span>{n.sentiment.ticker}</span>}
                      </div>
                    </div>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
