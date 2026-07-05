import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";

type WatchlistRow = {
  ticker: string;
  yahoo_symbol: string;
  company_name: string | null;
  sector: string | null;
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

// Same public endpoint the `yfinance` Python library wraps — no API key
// needed, but keep requests polite (sequential + small delay) since it's an
// unofficial-but-public JSON endpoint on Yahoo's own infrastructure.
async function fetchOhlc(yahooSymbol: string): Promise<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=3mo&interval=1d`;
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

export async function pullMarketData(): Promise<{ tickersUpdated: number; rowsUpserted: number; failed: string[] }> {
  const supabase = getSupabaseClient();
  const { data: watchlist, error } = await supabase
    .from("watchlist")
    .select("ticker, yahoo_symbol, company_name, sector")
    .eq("active", true);

  if (error) throw error;
  const rows = (watchlist ?? []) as WatchlistRow[];

  let tickersUpdated = 0;
  let rowsUpserted = 0;
  const failed: string[] = [];

  for (const row of rows) {
    try {
      const ohlc = await fetchOhlc(row.yahoo_symbol);
      if (ohlc.length === 0) {
        failed.push(row.ticker);
        continue;
      }

      const payload = ohlc.map((bar) => ({
        ticker: row.ticker,
        company_name: row.company_name,
        sector: row.sector,
        ...bar,
      }));

      const { error: upsertError } = await supabase.from("price_data").upsert(payload, { onConflict: "ticker,date" });
      if (upsertError) throw upsertError;

      rowsUpserted += payload.length;
      tickersUpdated++;
    } catch (err) {
      console.warn(`[market_data_pull] ${row.ticker} (${row.yahoo_symbol}) failed:`, err instanceof Error ? err.message : err);
      failed.push(row.ticker);
    }
    await sleep(300); // stay polite to Yahoo's endpoint across ~20-40 sequential requests
  }

  console.log(`[market_data_pull] done — ${tickersUpdated}/${rows.length} tickers updated, ${rowsUpserted} price rows upserted, ${failed.length} failed`);
  return { tickersUpdated, rowsUpserted, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  pullMarketData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
