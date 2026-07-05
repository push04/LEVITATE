import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus, TriangleAlert } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase';
import PriceChart from '@/components/market-pulse/PriceChart';
import { TechnicalVisuals, FundamentalsGrid, type Fundamentals } from '@/components/market-pulse/StockMetrics';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Market Pulse — Levitate Labs',
  description:
    'A daily read on Indian stock market sentiment, price movement, and technicals — built for business owners deciding where surplus cash might go.',
};

type DigestRow = {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  sentiment_trend: string;
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
};

function formatPct(value: number | null) {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function SentimentMark({ sentiment }: { sentiment: string }) {
  if (sentiment === 'bullish') return <ArrowUpRight className="h-4 w-4 text-[var(--status-closed)]" />;
  if (sentiment === 'bearish') return <ArrowDownRight className="h-4 w-4 text-[#9a5252]" />;
  return <Minus className="h-4 w-4 text-[var(--text-tertiary)]" />;
}

function InsiderNote({ d }: { d: DigestRow }) {
  const hasInsider = (d.insider_buy_count_30d ?? 0) > 0 || (d.insider_sell_count_30d ?? 0) > 0;
  if (!hasInsider) return null;

  return (
    <div className="mt-3 type-caption text-[var(--text-tertiary)]">
      Insider filings (30d): {d.insider_buy_count_30d ?? 0} buy / {d.insider_sell_count_30d ?? 0} sell
    </div>
  );
}

function RiskBadge({ level }: { level: string | null }) {
  const style =
    level === 'elevated'
      ? 'border-[rgba(154,82,82,0.35)] bg-[rgba(154,82,82,0.08)] text-[#9a5252]'
      : level === 'low'
        ? 'border-[rgba(61,122,92,0.35)] bg-[rgba(61,122,92,0.08)] text-[var(--status-closed)]'
        : 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-tertiary)]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style}`}>
      {level === 'elevated' && <TriangleAlert className="h-3 w-3" />}
      {level ?? 'moderate'} risk
    </span>
  );
}

async function getPublishedDigest() {
  const supabase = getServiceSupabase();

  const { data: latestDateRow } = await supabase
    .from('daily_digest')
    .select('digest_date')
    .eq('published', true)
    .order('digest_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestDateRow) return { digestDate: null as string | null, digest: [] as DigestRow[] };

  const digestDate = latestDateRow.digest_date as string;

  // Optional columns land via separate migrations that may not all be
  // applied yet — select everything, and if that errors (column doesn't
  // exist), fall back to just the always-present base columns rather than
  // letting the whole page silently render "nothing published" (data would
  // otherwise be null and get treated as an empty digest).
  const BASE_DIGEST_COLUMNS =
    'ticker, company_name, sector, sentiment_trend, price_change_pct, rsi_14, trend_signal, divergence_flag, summary_text, detailed_analysis, risk_notes, risk_level';
  const OPTIONAL_DIGEST_COLUMNS =
    'insider_buy_count_30d, insider_sell_count_30d, analyst_target_mean_price, analyst_recommendation_key, current_price, macd, macd_signal, sma_20, sma_50, adx_14, atr_14, stoch_k, cci_20, williams_r_14, volume, avg_volume_20, high_52w, low_52w';

  let { data } = await supabase
    .from('daily_digest')
    .select(`${BASE_DIGEST_COLUMNS}, ${OPTIONAL_DIGEST_COLUMNS}`)
    .eq('digest_date', digestDate)
    .eq('published', true)
    .order('divergence_flag', { ascending: false })
    .order('avg_confidence', { ascending: false });

  if (data == null) {
    const fallback = await supabase
      .from('daily_digest')
      .select(BASE_DIGEST_COLUMNS)
      .eq('digest_date', digestDate)
      .eq('published', true)
      .order('divergence_flag', { ascending: false })
      .order('avg_confidence', { ascending: false });
    data = fallback.data as typeof data;
  }

  const { data: fundamentalsRows } = await supabase
    .from('fundamentals')
    .select('ticker, pe_forward, return_on_equity, return_on_assets, debt_to_equity, revenue_growth, earnings_growth, profit_margin, analyst_target_mean_price, analyst_recommendation_key, number_of_analyst_opinions');
  const fundamentalsByTicker = new Map((fundamentalsRows ?? []).map((f) => [f.ticker, f]));

  const digest = (data ?? []).map((d) => ({ ...d, fundamentals: fundamentalsByTicker.get(d.ticker) ?? null }));

  return { digestDate, digest: digest as DigestRow[] };
}

type TrackRecord = {
  live: { total: number; correct: number; accuracyPct: number | null };
  backtest: {
    run_at: string;
    target_days: number;
    total_signals: number;
    overall_accuracy_pct: number | null;
  } | null;
};

async function getTrackRecord(): Promise<TrackRecord> {
  const supabase = getServiceSupabase();

  const { data: evaluatedPredictions } = await supabase
    .from('predictions')
    .select('outcome')
    .eq('evaluated', true);

  const rows = evaluatedPredictions ?? [];
  const total = rows.length;
  const correct = rows.filter((r) => r.outcome === 'correct').length;
  const accuracyPct = total > 0 ? Math.round((correct / total) * 1000) / 10 : null;

  const { data: latestBacktest } = await supabase
    .from('backtest_runs')
    .select('run_at, target_days, total_signals, overall_accuracy_pct')
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { live: { total, correct, accuracyPct }, backtest: latestBacktest ?? null };
}

export default async function MarketPulsePage() {
  const { digestDate, digest } = await getPublishedDigest();
  const trackRecord = await getTrackRecord();

  const bullish = digest.filter((d) => d.sentiment_trend === 'bullish').length;
  const bearish = digest.filter((d) => d.sentiment_trend === 'bearish').length;
  const neutral = digest.length - bullish - bearish;
  const divergences = digest.filter((d) => d.divergence_flag);
  const rest = digest.filter((d) => !d.divergence_flag);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border-default)] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="type-subheading text-[var(--text-accent)]">Market Pulse</div>
          <h1 className="font-serif-display mt-4 text-[40px] leading-[1.05] tracking-tight text-[var(--text-primary)] md:text-[56px]">
            Where the market&rsquo;s attention is today.
          </h1>
          <p className="mt-6 max-w-2xl type-body text-[17px] leading-8 text-[var(--text-secondary)]">
            A daily read on Indian (NSE/BSE) stock market sentiment, price movement, and
            technicals — built as a starting point for business owners thinking about where
            surplus cash might go. The watchlist below is chosen fresh every day from actual
            market movers and news coverage, not a fixed list.
          </p>
          {digestDate && (
            <div className="mt-6 type-caption text-[var(--text-tertiary)]">Last updated {digestDate}</div>
          )}
        </div>
      </section>

      {digest.length === 0 ? (
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
            <p className="type-body text-[var(--text-secondary)]">
              Nothing published yet — check back shortly.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="border-b border-[var(--border-default)] px-6 py-14">
            <div className="mx-auto grid max-w-4xl grid-cols-3 gap-8">
              <div>
                <div className="type-stat text-[var(--status-closed)]">{bullish}</div>
                <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Bullish</div>
              </div>
              <div>
                <div className="type-stat text-[#9a5252]">{bearish}</div>
                <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Bearish</div>
              </div>
              <div>
                <div className="type-stat text-[var(--text-secondary)]">{neutral}</div>
                <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Neutral</div>
              </div>
            </div>
          </section>

          {divergences.length > 0 && (
            <section className="px-6 py-16">
              <div className="mx-auto max-w-4xl">
                <div className="type-subheading text-[var(--text-accent)]">Worth a second look</div>
                <h2 className="font-serif-display mt-2 text-[26px] text-[var(--text-primary)]">
                  Sentiment and price disagree
                </h2>
                <p className="mt-2 max-w-xl type-body text-[var(--text-secondary)]">
                  These moved opposite to what the news coverage suggests — the market may not
                  have caught up yet, or the reaction may be overdone.
                </p>
                <div className="mt-8 space-y-6">
                  {divergences.map((d) => (
                    <div key={d.ticker} className="rounded-[16px] border border-[var(--border-strong)] bg-[var(--gold-glow)] p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <SentimentMark sentiment={d.sentiment_trend} />
                        <span className="type-heading text-[var(--text-primary)]">{d.company_name ?? d.ticker}</span>
                        <span className="type-caption">{d.ticker}{d.sector ? ` · ${d.sector}` : ''}</span>
                        <span className="ml-auto type-heading text-[var(--text-primary)]">{formatPct(d.price_change_pct)}</span>
                      </div>
                      <p className="mt-3 type-body text-[var(--text-secondary)]">{d.summary_text}</p>
                      <div className="mt-4 rounded-[10px] bg-[var(--bg-elevated)] p-4">
                        <PriceChart ticker={d.ticker} priceEndpoint="/api/market-pulse/prices" />
                      </div>
                      <div className="mt-4">
                        <TechnicalVisuals
                          m={{
                            current_price: d.current_price, macd: d.macd, macd_signal: d.macd_signal,
                            sma_20: d.sma_20, sma_50: d.sma_50, adx_14: d.adx_14, atr_14: d.atr_14,
                            rsi_14: d.rsi_14, stoch_k: d.stoch_k, cci_20: d.cci_20, williams_r_14: d.williams_r_14,
                            volume: d.volume, avg_volume_20: d.avg_volume_20, high_52w: d.high_52w, low_52w: d.low_52w,
                          }}
                        />
                      </div>
                      {d.detailed_analysis && (
                        <div className="mt-4">
                          <div className="type-subheading text-[var(--text-tertiary)]">Technical read</div>
                          <p className="mt-1.5 type-body text-[var(--text-secondary)]">{d.detailed_analysis}</p>
                        </div>
                      )}
                      {d.risk_notes && (
                        <div className="mt-3 flex items-start gap-2">
                          <RiskBadge level={d.risk_level} />
                          <p className="type-caption leading-5">{d.risk_notes}</p>
                        </div>
                      )}
                      {d.fundamentals && (
                        <div className="mt-4">
                          <FundamentalsGrid f={d.fundamentals} currentPrice={d.current_price} />
                        </div>
                      )}
                      <InsiderNote d={d} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="px-6 py-16">
            <div className="mx-auto max-w-4xl">
              <div className="type-subheading text-[var(--text-accent)]">Today&rsquo;s watchlist</div>
              <h2 className="font-serif-display mt-2 text-[26px] text-[var(--text-primary)]">
                Sentiment, price, and technicals
              </h2>
              <p className="mt-2 max-w-xl type-body text-[var(--text-secondary)]">
                Selected fresh today from real price movement (top gainers, losers, and most-active
                shares) and what&rsquo;s trending in the news — not a fixed list of stocks.
              </p>

              <div className="mt-8 space-y-4">
                {rest.map((d) => (
                  <details key={d.ticker} className="group rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-5">
                      <span className="type-heading text-[var(--text-primary)]">{d.company_name ?? d.ticker}</span>
                      <span className="type-caption">{d.ticker}{d.sector ? ` · ${d.sector}` : ''}</span>
                      <span className="flex items-center gap-1.5 capitalize type-body text-[var(--text-secondary)]">
                        <SentimentMark sentiment={d.sentiment_trend} />
                        {d.sentiment_trend}
                      </span>
                      <span className={`type-heading ${d.price_change_pct != null && d.price_change_pct > 0 ? 'text-[var(--status-closed)]' : d.price_change_pct != null && d.price_change_pct < 0 ? 'text-[#9a5252]' : 'text-[var(--text-secondary)]'}`}>
                        {formatPct(d.price_change_pct)}
                      </span>
                      <span className="capitalize type-caption">{d.trend_signal} signal</span>
                      <RiskBadge level={d.risk_level} />
                      <span className="ml-auto type-caption text-[var(--text-accent)] group-open:hidden">Expand ↓</span>
                      <span className="ml-auto hidden type-caption text-[var(--text-accent)] group-open:inline">Collapse ↑</span>
                    </summary>
                    <div className="border-t border-[var(--border-default)] p-5">
                      <div className="rounded-[10px] bg-[var(--bg-surface)] p-4">
                        <PriceChart ticker={d.ticker} priceEndpoint="/api/market-pulse/prices" />
                      </div>
                      <div className="mt-4">
                        <TechnicalVisuals
                          m={{
                            current_price: d.current_price, macd: d.macd, macd_signal: d.macd_signal,
                            sma_20: d.sma_20, sma_50: d.sma_50, adx_14: d.adx_14, atr_14: d.atr_14,
                            rsi_14: d.rsi_14, stoch_k: d.stoch_k, cci_20: d.cci_20, williams_r_14: d.williams_r_14,
                            volume: d.volume, avg_volume_20: d.avg_volume_20, high_52w: d.high_52w, low_52w: d.low_52w,
                          }}
                        />
                      </div>
                      {d.detailed_analysis && (
                        <div className="mt-4">
                          <div className="type-subheading text-[var(--text-tertiary)]">Technical read</div>
                          <p className="mt-1.5 type-body text-[var(--text-secondary)]">{d.detailed_analysis}</p>
                        </div>
                      )}
                      {d.risk_notes && (
                        <p className="mt-3 type-caption leading-5">{d.risk_notes}</p>
                      )}
                      {d.fundamentals && (
                        <div className="mt-4">
                          <FundamentalsGrid f={d.fundamentals} currentPrice={d.current_price} />
                        </div>
                      )}
                      <InsiderNote d={d} />
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {(trackRecord.live.total > 0 || trackRecord.backtest) && (
            <section className="border-t border-[var(--border-default)] px-6 py-16">
              <div className="mx-auto max-w-4xl">
                <div className="type-subheading text-[var(--text-accent)]">Track record</div>
                <h2 className="font-serif-display mt-2 text-[26px] text-[var(--text-primary)]">
                  Every signal, checked against what actually happened
                </h2>
                <p className="mt-2 max-w-xl type-body text-[var(--text-secondary)]">
                  Each day&rsquo;s bullish, bearish, or neutral call is recorded and automatically
                  graded seven trading days later against the real price. Nothing here is asserted
                  without being checked.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6">
                    <div className="type-subheading text-[var(--text-tertiary)]">Live predictions, evaluated</div>
                    <div className="font-serif-display mt-2 text-[36px] text-[var(--text-primary)]">
                      {trackRecord.live.accuracyPct != null ? `${trackRecord.live.accuracyPct}%` : '—'}
                    </div>
                    <p className="mt-1 type-caption">
                      {trackRecord.live.total > 0
                        ? `${trackRecord.live.correct} of ${trackRecord.live.total} calls correct so far, 7 trading days out`
                        : 'No predictions have matured yet — check back soon'}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6">
                    <div className="type-subheading text-[var(--text-tertiary)]">Backtested against history</div>
                    <div className="font-serif-display mt-2 text-[36px] text-[var(--text-primary)]">
                      {trackRecord.backtest?.overall_accuracy_pct != null ? `${trackRecord.backtest.overall_accuracy_pct}%` : '—'}
                    </div>
                    <p className="mt-1 type-caption">
                      {trackRecord.backtest
                        ? `${trackRecord.backtest.total_signals} historical signals re-checked over ${trackRecord.backtest.target_days} trading days each`
                        : 'Backtest has not run yet'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="px-6 pb-16">
            <div className="mx-auto max-w-4xl rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
              <p className="type-caption leading-5">
                Informational only, not investment advice. The technical read and risk notes above
                are generated by a deterministic rules engine from real price and indicator data
                (RSI, MACD, moving averages, Bollinger Bands, ATR) — sentiment tags are derived from
                AI classification of public news headlines and can be wrong. Nothing here is a
                prediction or a recommendation to buy or sell. Please do your own research or
                consult a SEBI-registered advisor before investing.
              </p>
            </div>
          </section>
        </>
      )}

      <section className="border-t border-[var(--border-default)] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif-display text-[28px] text-[var(--text-primary)] md:text-[34px]">
            Want this inside your own business dashboard?
          </h2>
          <p className="mx-auto mt-3 max-w-xl type-body text-[var(--text-secondary)]">
            Growth OS and Scale Suite customers get the full daily digest, recent news with
            sentiment tags, and a self-updating watchlist — inside LevitateOS.
          </p>
          <Link
            href="/pricing"
            className="mt-7 inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(176,141,87,0.3)] transition-transform hover:-translate-y-px"
          >
            See plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
