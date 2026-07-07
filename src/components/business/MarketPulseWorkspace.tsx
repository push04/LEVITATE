'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, ExternalLink, Loader2, Lock, Mail, MessageCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import DigestCard from '@/components/market-pulse/DigestCard';
import WatchlistSection from '@/components/market-pulse/WatchlistSection';
import { SectorOverviewTable } from '@/components/market-pulse/SectorOverview';
import { formatIndianDate } from '@/lib/date-format';
import type { Fundamentals, Finding, RiskFinding, PredictionTracking, TickerNewsItem } from '@/components/market-pulse/StockMetrics';

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
  insider_buy_count_30d: number | null;
  insider_sell_count_30d: number | null;
  analyst_target_mean_price: number | null;
  analyst_recommendation_key: string | null;
  current_price: number | null;
  macd: number | null;
  macd_signal: number | null;
  sma_20: number | null;
  sma_50: number | null;
  adx_14: number | null;
  atr_14: number | null;
  stoch_k: number | null;
  cci_20: number | null;
  williams_r_14: number | null;
  volume: number | null;
  avg_volume_20: number | null;
  high_52w: number | null;
  low_52w: number | null;
  fundamentals: Fundamentals | null;
  signal_findings: Finding[] | null;
  risk_findings: RiskFinding[] | null;
  prediction: PredictionTracking | null;
  news: TickerNewsItem[] | null;
  confidence_score: number | null;
  confidence_reason: string | null;
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

interface MarketPulseWorkspaceProps {
  // Trial mode: pass an invite code and this component fetches from the
  // invite-gated public trial routes instead of the paid business ones,
  // showing the exact same real experience for the trial window.
  apiEndpoint?: string;
  priceEndpoint?: string;
  trialCode?: string;
}

export default function MarketPulseWorkspace({
  apiEndpoint = '/api/business/market-pulse',
  priceEndpoint = '/api/business/market-pulse/prices',
  trialCode,
}: MarketPulseWorkspaceProps = {}) {
  const [digest, setDigest] = useState<DigestRow[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [digestDate, setDigestDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [trackRecord, setTrackRecord] = useState<TrackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialBusinessName, setTrialBusinessName] = useState<string | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);

  const scopedPriceEndpoint = trialCode ? `${priceEndpoint}?code=${encodeURIComponent(trialCode)}` : priceEndpoint;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedDate) params.set('date', selectedDate);
        if (trialCode) params.set('code', trialCode);
        const qs = params.toString();
        const res = await fetch(qs ? `${apiEndpoint}?${qs}` : apiEndpoint);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load Market Pulse');
        if (json.trialExpired) {
          setTrialExpired(true);
          setTrialBusinessName(json.businessName ?? null);
          return;
        }
        setDigest(json.digest ?? []);
        setNews(json.news ?? []);
        setDigestDate(json.digestDate ?? null);
        setAvailableDates(json.availableDates ?? []);
        setTrackRecord(json.trackRecord ?? null);
        if (trialCode) {
          setTrialBusinessName(json.businessName ?? null);
          setTrialDaysRemaining(json.daysRemaining ?? null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Market Pulse');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate, apiEndpoint, trialCode]);

  const divergences = digest.filter((d) => d.divergence_flag);
  const rest = digest.filter((d) => !d.divergence_flag);

  if (trialExpired) {
    return (
      <div className={`${styles.panel} p-8 text-center`}>
        <Lock className="mx-auto h-8 w-8 text-[var(--gold-base)]" />
        <h2 className="mt-3 type-heading text-[var(--text-primary)]">
          {trialBusinessName ? `${trialBusinessName}'s` : 'Your'} trial has ended
        </h2>
        <p className="mx-auto mt-2 max-w-md type-body text-[var(--text-secondary)]">
          To keep getting daily Market Pulse digests, predictions, and technicals, email us or get in
          touch - we&rsquo;ll set your business up properly.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            href="mailto:pushpal@levitatelabs.online"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-2.5 type-body font-semibold text-[var(--text-inverse)]"
          >
            <Mail className="h-4 w-4" /> Email pushpal@levitatelabs.online
          </a>
          <a
            href="/#contact"
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-2.5 type-body font-semibold text-[var(--text-primary)]"
          >
            <MessageCircle className="h-4 w-4" /> Contact us
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {trialCode && (
        <div className="rounded-[14px] border border-[rgba(201,165,90,0.3)] bg-[var(--gold-glow)] p-4">
          <p className="type-body text-[var(--text-primary)]">
            Trial active{trialBusinessName ? ` for ${trialBusinessName}` : ''}
            {trialDaysRemaining != null ? ` - ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining` : ''}.
          </p>
        </div>
      )}
      <div className={`${styles.panel} p-6 md:p-8`}>
        <div className="type-subheading text-[var(--text-tertiary)]">Market Pulse</div>
        <h1 className="mt-3 type-hero text-[var(--text-primary)]">Where the market's attention is today</h1>
        <p className="mt-3 max-w-3xl type-body text-[var(--text-secondary)]">
          Daily Indian (NSE/BSE) stock market sentiment, price movement, and technicals for a
          watchlist chosen fresh every day from real market movers and news coverage - a starting
          point for thinking about where surplus business cash might go, not a recommendation.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3 text-[12px] leading-5 text-[var(--text-tertiary)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold-base)]" />
          <span>
            Informational only - not investment advice. The technical read and risk notes are
            generated by a deterministic rules engine from real price/indicator data (RSI, MACD,
            moving averages, Bollinger Bands, ATR); sentiment tags come from AI classification of
            public news and can be wrong. Please do your own research or consult a
            SEBI-registered advisor before investing.
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {digestDate && (
            <div className="type-caption text-[var(--text-tertiary)]">Showing: {formatIndianDate(digestDate)}</div>
          )}
          {availableDates.length > 1 && (
            <label className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-1.5 type-caption text-[var(--text-secondary)]">
              <CalendarClock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <select
                value={digestDate ?? ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent type-caption text-[var(--text-secondary)] focus:outline-none"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {formatIndianDate(d)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {trackRecord && (trackRecord.live.total > 0 || trackRecord.backtest) && (
        <div className={`${styles.panel} p-6`}>
          <div className="type-subheading text-[var(--text-tertiary)]">Track record</div>
          <p className="mt-1 type-caption text-[var(--text-tertiary)]">
            Every bullish/bearish/neutral call is recorded and auto-graded against the real price
            seven trading days later - nothing is asserted without being checked.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-4">
              <div className="type-caption text-[var(--text-tertiary)]">Live predictions, evaluated</div>
              <div className="mt-1 type-hero text-[var(--text-primary)]">
                {trackRecord.live.accuracyPct != null ? `${trackRecord.live.accuracyPct}%` : '-'}
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
                {trackRecord.backtest?.overall_accuracy_pct != null ? `${trackRecord.backtest.overall_accuracy_pct}%` : '-'}
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
          No digest yet - the daily scraper hasn't run for this workspace yet. Check back tomorrow morning.
        </div>
      ) : (
        <>
          <div className={`${styles.panel} p-6`}>
            <div className="type-subheading text-[var(--text-tertiary)]">Sector overview</div>
            <p className="mt-1 type-caption text-[var(--text-tertiary)]">Where today&rsquo;s movement is concentrated, by sector.</p>
            <div className="mt-4">
              <SectorOverviewTable items={digest} />
            </div>
          </div>

          {divergences.length > 0 && (
            <div className={`${styles.panel} p-6`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Worth a second look</div>
              <p className="mt-1 type-caption text-[var(--text-tertiary)]">
                Sentiment and price are moving in opposite directions - the market may not have caught up yet, or the news reaction is overdone.
              </p>
              <div className="mt-4 space-y-3">
                {divergences.map((d) => <DigestCard key={d.ticker} d={d} priceEndpoint={scopedPriceEndpoint} highlighted />)}
              </div>
            </div>
          )}

          <div className={`${styles.panel} p-6`}>
            <div className="type-subheading text-[var(--text-tertiary)]">Today's watchlist</div>
            <p className="mt-1 type-caption text-[var(--text-tertiary)]">
              Selected fresh today from real price movement (top gainers, losers, most-active) and
              news trends - not a fixed list.
            </p>
            <div className="mt-4">
              <WatchlistSection items={rest} priceEndpoint={scopedPriceEndpoint} />
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
