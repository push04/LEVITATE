import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";

const TOP_GAINERS_COUNT = 10;
const TOP_LOSERS_COUNT = 10;
const TOP_VOLUME_COUNT = 8;

export type MarketMover = {
  ticker: string;
  changePct: number;
  volume: number;
  reason: string;
};

// Real, objective market-movers ranking — no hand-picked ticker list. Reads
// whatever price_data ingestion/market_data_pull.ts already pulled for the
// FULL nse_universe.json pool (not just today's watchlist) and ranks by
// actual price change % and volume, exactly what a market-movers screener
// would show. This is one of the two inputs to watchlist_update.ts (the
// other being Groq's news-trending pick) — between them, the daily watchlist
// is entirely determined by what the market and the news actually did today.
export async function findMarketMovers(): Promise<{ gainers: MarketMover[]; losers: MarketMover[]; mostActive: MarketMover[] }> {
  const supabase = getSupabaseClient();
  const { data: universeRows, error: universeError } = await supabase
    .from("nse_universe")
    .select("ticker")
    .eq("pinned", false); // indices aren't "movers"
  if (universeError) throw universeError;
  const universeTickerCount = (universeRows ?? []).length;

  // One batched query for the last ~5 days across ALL of price_data (not
  // filtered `.in(ticker, ...)` against the full ~500-ticker universe, which
  // would build an unwieldy query string) — cheap since it's a single narrow
  // date-range scan, and we only care about tickers that actually have rows.
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: recentRows, error } = await supabase
    .from("price_data")
    .select("ticker, date, close, volume")
    .gte("date", fiveDaysAgo)
    .order("date", { ascending: false })
    .limit(10000);

  if (error) throw error;

  const byTicker = new Map<string, Array<{ date: string; close: number; volume: number }>>();
  for (const row of recentRows ?? []) {
    const list = byTicker.get(row.ticker as string) ?? [];
    list.push({ date: row.date as string, close: row.close as number, volume: (row.volume as number) ?? 0 });
    byTicker.set(row.ticker as string, list);
  }

  const moves: MarketMover[] = [];
  for (const [ticker, rows] of byTicker) {
    if (rows.length < 2) continue; // rows are already date-desc from the query
    const [latest, previous] = rows;
    if (!previous.close) continue;

    const changePct = Math.round(((latest.close - previous.close) / previous.close) * 10000) / 100;
    moves.push({ ticker, changePct, volume: latest.volume, reason: "" });
  }

  const byChangeDesc = [...moves].sort((a, b) => b.changePct - a.changePct);
  const gainers = byChangeDesc
    .slice(0, TOP_GAINERS_COUNT)
    .filter((m) => m.changePct > 0)
    .map((m) => ({ ...m, reason: `Top gainer today (+${m.changePct}%)` }));

  const byChangeAsc = [...moves].sort((a, b) => a.changePct - b.changePct);
  const losers = byChangeAsc
    .slice(0, TOP_LOSERS_COUNT)
    .filter((m) => m.changePct < 0)
    .map((m) => ({ ...m, reason: `Top loser today (${m.changePct}%)` }));

  const byVolumeDesc = [...moves].sort((a, b) => b.volume - a.volume);
  const mostActive = byVolumeDesc
    .slice(0, TOP_VOLUME_COUNT)
    .map((m) => ({ ...m, reason: `High trading volume today (${m.volume.toLocaleString("en-IN")} shares)` }));

  console.log(`[market_movers] ${gainers.length} gainers, ${losers.length} losers, ${mostActive.length} most-active from ${moves.length}/${universeTickerCount} universe tickers with 2+ days of price data`);
  return { gainers, losers, mostActive };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  findMarketMovers()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
