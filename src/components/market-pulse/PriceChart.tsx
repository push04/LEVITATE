'use client';

import { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, HistogramSeries, createChart, type IChartApi } from 'lightweight-charts';
import { Loader2 } from 'lucide-react';

type Bar = { date: string; open: number; high: number; low: number; close: number; volume?: number };

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
        // width is set for real by the ResizeObserver below, right after
        // creation - createChart itself just needs a starting value, which
        // matters because this component is often mounted while collapsed
        // inside a <details> accordion (clientWidth reads 0 there) and
        // nothing would otherwise ever tell the chart it became visible.
        const chart = createChart(container, {
          width: container.clientWidth || 400,
          height: 320,
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
          priceScaleId: 'right',
        });
        series.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: 0.28 } });

        const bars = json.bars ?? [];
        series.setData(
          bars.map((b) => ({
            time: b.date,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }))
        );

        // Volume as a separate pane at the bottom of the same chart, not a
        // whole extra widget - gives the card real visual depth instead of
        // just a single candlestick line.
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
        volumeSeries.setData(
          bars
            .filter((b) => b.volume != null)
            .map((b) => ({
              time: b.date,
              value: b.volume as number,
              color: b.close >= b.open ? 'rgba(61,122,92,0.5)' : 'rgba(154,82,82,0.5)',
            }))
        );

        chart.timeScale().fitContent();
        setLoading(false);

        const resizeObserver = new ResizeObserver((entries) => {
          const width = entries[0]?.contentRect.width;
          if (width && width > 0) chart.applyOptions({ width });
        });
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
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
        <div className="flex h-[320px] items-center justify-center text-[var(--text-tertiary)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {error && <div className="flex h-[320px] items-center justify-center text-sm text-[#9a5252]">{error}</div>}
      <div ref={containerRef} className={loading || error ? 'hidden' : ''} />
    </div>
  );
}
