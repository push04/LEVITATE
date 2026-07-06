import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";

type UniverseRow = {
  ticker: string;
  yahoo_symbol: string;
  company_name: string;
  sector: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same public endpoint the `yfinance` Python library wraps - no API key needed.
async function fetchOhlc(yahooSymbol: string): Promise<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>> {
  // 1y (not 3mo) so technical_analysis.ts can compute real 52-week high/low
  // proximity, not just short-window indicators.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1y&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketPulse/1.0; +https://levitatelabs.online)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  if (!result || data.chart?.error) {
    throw new Error(data.chart?.error?.description ?? "no result in chart response");
  }

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const rows: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i];
    if (open == null || high == null || low == null || close == null) continue;

    rows.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    });
  }
  return rows;
}

// How many tickers to fetch concurrently. At the ~500-ticker Nifty 500 scale,
// one-at-a-time (even with a small delay) would take 15-20+ minutes; batched
// concurrency keeps a full run to a few minutes while still pausing briefly
// between batches so we're not opening 500 simultaneous connections to
// Yahoo's endpoint at once.
const CONCURRENCY = 10;
const DELAY_BETWEEN_BATCHES_MS = 400;

// Pulls OHLC for the ENTIRE NSE universe (synced fresh from NSE's official
// Nifty 500 list by ingestion/universe_sync.ts), not just today's active
// watchlist. This is deliberate: it's what lets watchlist_update.ts rank
// *real* gainers/losers/most-active across the full universe instead of only
// ever reshuffling among tickers already selected.
export async function pullMarketData(): Promise<{ tickersUpdated: number; rowsUpserted: number; failed: string[] }> {
  const supabase = getSupabaseClient();
  const { data: universeRows, error: universeError } = await supabase
    .from("nse_universe")
    .select("ticker, yahoo_symbol, company_name, sector");
  if (universeError) throw universeError;

  const rows = (universeRows ?? []) as UniverseRow[];

  let tickersUpdated = 0;
  let rowsUpserted = 0;
  const failed: string[] = [];

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (row) => {
        const ohlc = await fetchOhlc(row.yahoo_symbol);
        if (ohlc.length === 0) throw new Error("empty OHLC response");
        return { row, payload: ohlc.map((bar) => ({ ticker: row.ticker, company_name: row.company_name, sector: row.sector, ...bar })) };
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const row = batch[j];
      if (result.status === "rejected") {
        console.warn(`[market_data_pull] ${row.ticker} (${row.yahoo_symbol}) failed:`, result.reason instanceof Error ? result.reason.message : result.reason);
        failed.push(row.ticker);
        continue;
      }

      const { error: upsertError } = await supabase.from("price_data").upsert(result.value.payload, { onConflict: "ticker,date" });
      if (upsertError) {
        console.warn(`[market_data_pull] ${row.ticker} upsert failed:`, upsertError.message);
        failed.push(row.ticker);
        continue;
      }

      rowsUpserted += result.value.payload.length;
      tickersUpdated++;
    }

    if (i + CONCURRENCY < rows.length) await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  console.log(`[market_data_pull] done - ${tickersUpdated}/${rows.length} tickers updated, ${rowsUpserted} price rows upserted, ${failed.length} failed`);
  return { tickersUpdated, rowsUpserted, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  pullMarketData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
