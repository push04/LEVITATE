'use client';

import { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, createChart, type IChartApi } from 'lightweight-charts';
import { Loader2 } from 'lucide-react';

type Bar = { date: string; open: number; high: number; low: number; close: number };

export default function PriceChart({ ticker, priceEndpoint }: { ticker: string; priceEndpoint: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${priceEndpoint}?ticker=${encodeURIComponent(ticker)}`);
        const json = await res.json() as { bars?: Bar[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? 'Failed to load price history');
        if (cancelled || !containerRef.current) return;

        const container = containerRef.current;
        const chart = createChart(container, {
          width: container.clientWidth,
          height: 260,
          layout: {
            background: { color: 'transparent' },
            textColor: 'var(--text-secondary, #6B6860)',
            fontFamily: 'inherit',
          },
          grid: {
            vertLines: { color: 'rgba(176,141,87,0.08)' },
            horzLines: { color: 'rgba(176,141,87,0.08)' },
          },
          rightPriceScale: { borderColor: 'rgba(176,141,87,0.15)' },
          timeScale: { borderColor: 'rgba(176,141,87,0.15)' },
        });
        chartRef.current = chart;

        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#3d7a5c',
          downColor: '#9a5252',
          borderUpColor: '#3d7a5c',
          borderDownColor: '#9a5252',
          wickUpColor: '#3d7a5c',
          wickDownColor: '#9a5252',
        });

        series.setData(
          (json.bars ?? []).map((b) => ({
            time: b.date,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }))
        );
        chart.timeScale().fitContent();

        const onResize = () => chart.applyOptions({ width: container.clientWidth });
        window.addEventListener('resize', onResize);
        setLoading(false);

        return () => window.removeEventListener('resize', onResize);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load chart');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [ticker, priceEndpoint]);

  return (
    <div className="relative">
      {loading && (
        <div className="flex h-[260px] items-center justify-center text-[var(--text-tertiary)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {error && <div className="flex h-[260px] items-center justify-center text-sm text-[#9a5252]">{error}</div>}
      <div ref={containerRef} className={loading || error ? 'hidden' : ''} />
    </div>
  );
}
