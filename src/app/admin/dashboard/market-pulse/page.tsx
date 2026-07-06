'use client';

import { useCallback, useEffect, useState } from 'react';
import { LineChart, Loader2 } from 'lucide-react';
import { formatIndianDate } from '@/lib/date-format';

type DigestRow = {
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
  published: boolean;
};

function formatPct(value: number | null) {
  if (value == null) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function AdminMarketPulsePage() {
  const [publishMode, setPublishMode] = useState<'auto' | 'manual'>('manual');
  const [digestDate, setDigestDate] = useState<string | null>(null);
  const [digest, setDigest] = useState<DigestRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [settingsRes, digestRes] = await Promise.all([
      fetch('/api/admin/market-pulse/settings'),
      fetch('/api/admin/market-pulse/digest'),
    ]);
    const settingsJson = await settingsRes.json() as { publishMode?: 'auto' | 'manual' };
    const digestJson = await digestRes.json() as { digestDate?: string | null; digest?: DigestRow[] };
    setPublishMode(settingsJson.publishMode ?? 'manual');
    setDigestDate(digestJson.digestDate ?? null);
    setDigest(digestJson.digest ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changePublishMode(mode: 'auto' | 'manual') {
    setSaving(true);
    await fetch('/api/admin/market-pulse/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishMode: mode }),
    });
    setPublishMode(mode);
    setSaving(false);
  }

  function toggleSelected(ticker: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  async function publishTickers(tickers: string[], published: boolean) {
    if (!digestDate || tickers.length === 0) return;
    setSaving(true);
    await fetch('/api/admin/market-pulse/digest', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digestDate, tickers, published }),
    });
    setSelected(new Set());
    await load();
    setSaving(false);
  }

  function publishSelected(published: boolean) {
    return publishTickers(Array.from(selected), published);
  }

  function publishAll(published: boolean) {
    return publishTickers(digest.map((d) => d.ticker), published);
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === digest.length ? new Set() : new Set(digest.map((d) => d.ticker))));
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  const publishedCount = digest.filter((d) => d.published).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <LineChart className="h-6 w-6 text-[#B08D57]" />
        <h1 className="text-2xl font-bold text-gray-900">Market Pulse</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-[13px] font-semibold text-gray-900">Public page publishing</p>
        <p className="mt-1 text-[12px] text-gray-400">
          Controls what shows on the public levitatelabs.online/market-pulse page. Business dashboard
          customers (Growth OS+) always see the full digest regardless of this setting.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void changePublishMode('auto')}
            className={`rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              publishMode === 'auto' ? 'border-[#B08D57] bg-[#B08D57]/10 text-[#8a6d3f]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Auto-publish everything
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void changePublishMode('manual')}
            className={`rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              publishMode === 'manual' ? 'border-[#B08D57] bg-[#B08D57]/10 text-[#8a6d3f]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Review and select manually
          </button>
          {digestDate && (
            <span className="text-[11px] text-gray-400">
              {formatIndianDate(digestDate)} - {publishedCount}/{digest.length} published
            </span>
          )}
        </div>
      </div>

      {digest.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">
          No digest yet - run the marketpulse scraper to generate today&apos;s data.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              Today&apos;s digest ({digestDate ? formatIndianDate(digestDate) : ''})
            </p>
            {publishMode === 'manual' && (
              <div className="flex flex-wrap gap-2">
                {selected.size > 0 && (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void publishSelected(true)}
                      className="rounded-lg bg-[#B08D57] px-3 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
                    >
                      Publish {selected.size} selected
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void publishSelected(false)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-gray-300"
                    >
                      Unpublish selected
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={saving || digest.length === 0}
                  onClick={() => void publishAll(true)}
                  className="rounded-lg border border-[#B08D57]/40 px-3 py-1.5 text-[11px] font-semibold text-[#8a6d3f] hover:bg-[#B08D57]/10"
                >
                  Publish all ({digest.length})
                </button>
                <button
                  type="button"
                  disabled={saving || digest.length === 0}
                  onClick={() => void publishAll(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-gray-300"
                >
                  Unpublish all
                </button>
              </div>
            )}
          </div>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                {publishMode === 'manual' && (
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={digest.length > 0 && selected.size === digest.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5"
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Sentiment</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Signal</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {digest.map((d) => (
                <tr key={d.ticker} className="border-b border-gray-50 last:border-0">
                  {publishMode === 'manual' && (
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(d.ticker)}
                        onChange={() => toggleSelected(d.ticker)}
                        className="h-3.5 w-3.5"
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{d.company_name ?? d.ticker}</div>
                    <div className="text-[11px] text-gray-400">{d.ticker}{d.divergence_flag ? ' · divergence' : ''}</div>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-gray-600">{d.sentiment_trend}</td>
                  <td className={`px-4 py-2.5 font-medium ${d.price_change_pct != null && d.price_change_pct > 0 ? 'text-emerald-600' : d.price_change_pct != null && d.price_change_pct < 0 ? 'text-red-500' : 'text-gray-600'}`}>
                    {formatPct(d.price_change_pct)}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-gray-600">{d.trend_signal}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${d.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.published ? 'Published' : 'Not published'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
