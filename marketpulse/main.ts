import "dotenv/config";
import { pullNews } from "./ingestion/news_pull.js";
import { updateWatchlist } from "./processing/watchlist_update.js";
import { pullMarketData } from "./ingestion/market_data_pull.js";
import { scoreSentiment } from "./processing/sentiment_score.js";
import { computeTechnicals } from "./processing/technicals.js";
import { buildDigest } from "./processing/digest.js";

async function main() {
  const start = Date.now();
  console.log(`\n=== MarketPulse daily run — ${new Date().toISOString()} ===\n`);

  // 1. News first — everything downstream depends on it (trend detection,
  //    sentiment scoring).
  await pullNews();

  // 2. Ask Groq what's trending in that news, update the active watchlist.
  await updateWatchlist();

  // 3. Pull OHLC for whatever's active now (includes anything newly added).
  await pullMarketData();

  // 4. Score sentiment on unscored news (ticker-matched against the universe).
  await scoreSentiment();

  // 5. Compute technical indicators from the price history just pulled.
  await computeTechnicals();

  // 6. Merge sentiment + technicals + price move into today's digest rows.
  await buildDigest();

  const seconds = Math.round((Date.now() - start) / 1000);
  console.log(`\n=== MarketPulse run complete in ${seconds}s ===\n`);
}

main().catch((err) => {
  console.error("[marketpulse] fatal error:", err);
  process.exit(1);
});
