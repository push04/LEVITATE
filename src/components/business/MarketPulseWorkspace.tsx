'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';

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
}

interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  published_at: string | null;
  sentiment: { ticker: string | null; sentiment: string; confidence: number; summary: string } | null;
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

function formatPct(value: number | null) {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function MarketPulseWorkspace() {
  const [digest, setDigest] = useState<DigestRow[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [digestDate, setDigestDate] = useState<string | null>(null);
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Market Pulse');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const divergences = digest.filter((d) => d.divergence_flag);

  return (
    <div className="space-y-6">
      <div className={`${styles.panel} p-6 md:p-8`}>
        <div className="type-subheading text-[var(--text-tertiary)]">Market Pulse</div>
        <h1 className="mt-3 type-hero text-[var(--text-primary)]">Where the market's attention is today</h1>
        <p className="mt-3 max-w-3xl type-body text-[var(--text-secondary)]">
          Daily Indian stock market sentiment (news-derived), price movement, and technicals for a
          watchlist that updates itself based on what's actually trending in the news — a starting
          point for thinking about where surplus business cash might go, not a recommendation.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3 text-[12px] leading-5 text-[var(--text-tertiary)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold-base)]" />
          <span>
            Informational only — not investment advice. Sentiment is derived from public news headlines
            via AI classification and can be wrong; technicals are backward-looking. Please do your own
            research or consult a SEBI-registered advisor before investing.
          </span>
        </div>
        {digestDate && (
          <div className="mt-3 type-caption text-[var(--text-tertiary)]">Last updated: {digestDate}</div>
        )}
      </div>

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
                {divergences.map((d) => (
                  <div key={d.ticker} className="rounded-[12px] border border-[rgba(200,169,110,0.35)] bg-[rgba(200,169,110,0.06)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{d.company_name ?? d.ticker}</span>
                      <span className="type-caption text-[var(--text-tertiary)]">{d.ticker}</span>
                      <SentimentBadge sentiment={d.sentiment_trend} />
                      <span className="type-caption text-[var(--text-tertiary)]">{formatPct(d.price_change_pct)}</span>
                    </div>
                    <p className="mt-2 type-body text-[var(--text-secondary)]">{d.summary_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`${styles.panel} overflow-hidden`}>
            <div className="p-6 pb-0">
              <div className="type-subheading text-[var(--text-tertiary)]">Today's watchlist</div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Sector</th>
                    <th className="px-4 py-3 font-medium">Sentiment</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">RSI-14</th>
                    <th className="px-4 py-3 font-medium">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {digest.map((d) => (
                    <tr key={d.ticker} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-overlay)]">
                      <td className="px-6 py-3">
                        <div className="font-medium text-[var(--text-primary)]">{d.company_name ?? d.ticker}</div>
                        <div className="type-caption text-[var(--text-tertiary)]">{d.ticker}</div>
                      </td>
                      <td className="px-4 py-3 type-caption text-[var(--text-tertiary)]">{d.sector ?? '—'}</td>
                      <td className="px-4 py-3"><SentimentBadge sentiment={d.sentiment_trend} /></td>
                      <td className={`px-4 py-3 font-medium ${d.price_change_pct != null && d.price_change_pct > 0 ? 'text-[var(--status-closed)]' : d.price_change_pct != null && d.price_change_pct < 0 ? 'text-[#c97a7a]' : 'text-[var(--text-secondary)]'}`}>
                        {formatPct(d.price_change_pct)}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{d.rsi_14 != null ? d.rsi_14.toFixed(1) : '—'}</td>
                      <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">{d.trend_signal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
