import "dotenv/config";
import { syncUniverse } from "./ingestion/universe_sync.js";
import { pullNews } from "./ingestion/news_pull.js";
import { pullReddit } from "./ingestion/reddit_pull.js";
import { updateWatchlist } from "./processing/watchlist_update.js";
import { pullMarketData } from "./ingestion/market_data_pull.js";
import { scoreSentiment } from "./processing/sentiment_score.js";
import { computeTechnicals } from "./processing/technicals.js";
import { buildDigest } from "./processing/digest.js";
import { evaluatePredictions } from "./processing/evaluate_predictions.js";
import { runBacktest } from "./processing/backtest.js";
import { getSupabaseClient } from "./db/supabase_client.js";

// Backtesting re-scans a full year of history per ticker — cheap enough to
// run daily, but pointless every 2-3 hours since the underlying history
// barely changes within a day. Gated the same way universe_sync gates its
// own re-fetch: skip if a run already happened recently.
const BACKTEST_INTERVAL_HOURS = 20;

async function shouldRunBacktest(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("backtest_runs").select("run_at").order("run_at", { ascending: false }).limit(1).maybeSingle();
  if (!data?.run_at) return true;
  const hoursSince = (Date.now() - new Date(data.run_at).getTime()) / (60 * 60 * 1000);
  return hoursSince >= BACKTEST_INTERVAL_HOURS;
}

async function main() {
  const start = Date.now();
  console.log(`\n=== MarketPulse daily run — ${new Date().toISOString()} ===\n`);

  // 1. Sync the real, NSE-published Nifty 500 constituent list — the
  //    candidate pool everything else scans/selects from. Not hand-picked.
  await syncUniverse();

  // 2. News and Reddit — everything downstream depends on these (trend
  //    detection, sentiment scoring).
  await pullNews();
  await pullReddit(); // no-ops gracefully if REDDIT_CLIENT_ID isn't set

  // 3. Pull OHLC for the FULL NSE universe (not just today's watchlist) —
  //    this is what lets step 4 rank real gainers/losers/most-active instead
  //    of only ever re-selecting from whatever was already being tracked.
  await pullMarketData();

  // 4. Watchlist = real market movers (from the price data just pulled)
  //    UNION Groq's news-trending picks. No hardcoded ticker list.
  await updateWatchlist();

  // 5. Score sentiment on unscored news + Reddit posts (ticker-matched
  //    against the real universe).
  await scoreSentiment();

  // 6. Compute technical indicators from the price history just pulled.
  await computeTechnicals();

  // 7. Merge sentiment + technicals + price move into today's digest rows —
  //    also records today's signal as a checkable prediction per ticker.
  await buildDigest();

  // 8. Accountability: auto-check any prediction whose target date arrived.
  await evaluatePredictions();

  // 9. Backtest the deterministic signal logic against full history — gated
  //    to roughly once a day even if this script runs more often.
  if (await shouldRunBacktest()) {
    await runBacktest();
  } else {
    console.log(`[backtest] skipped — last run was within ${BACKTEST_INTERVAL_HOURS}h`);
  }

  const seconds = Math.round((Date.now() - start) / 1000);
  console.log(`\n=== MarketPulse run complete in ${seconds}s ===\n`);
}

main().catch((err) => {
  console.error("[marketpulse] fatal error:", err);
  process.exit(1);
});
