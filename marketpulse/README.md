# MarketPulse

Indian stock market news, sentiment, and technicals engine feeding a "where should this business park its surplus cash" view inside the LevitateOS business dashboard (`/business/dashboard/market-pulse`).

Runs standalone, on your own machine, once a day - same pattern as `tenderpulse-bj`. It writes straight into the same Supabase project levitatelabs.online uses; the Next.js app just reads what's there.

## What it does, in order (`main.ts`)

1. **`ingestion/news_pull.ts`** - pulls Moneycontrol / Economic Times / LiveMint RSS feeds, inserts new articles into `news_articles` (dedup on `link`).
2. **`processing/watchlist_update.ts`** - sends the last 48h of headlines to Groq along with a fixed universe of ~85 valid NSE tickers (`config/nse_universe.json`) and asks which are trending right now. The `watchlist` table is the live result: Groq can only pick tickers that already exist in the universe (never invents one), a 15-stock baseline always stays active for diversified coverage, the Nifty/Sensex indices are pinned permanently, and anything not confirmed trending or baseline in 14 days gets marked inactive.
3. **`ingestion/market_data_pull.ts`** - pulls 3 months of daily OHLC from Yahoo Finance's public chart endpoint (same data `yfinance` wraps, no API key) for every currently-active watchlist ticker, upserts into `price_data`.
4. **`processing/sentiment_score.ts`** - Groq-classifies each unscored news article: ticker (only if it matches the universe), sector, sentiment (bullish/bearish/neutral), confidence, one-line summary. Writes to `sentiment_scores`.
5. **`processing/technicals.ts`** - computes RSI-14, MACD, SMA-20/50, EMA-20, Bollinger Bands, ATR-14 (via the `technicalindicators` package) from each ticker's price history, upserts into `technical_indicators`.
6. **`processing/digest.ts`** - merges the above into one row per ticker in `daily_digest`: sentiment trend, today's price change %, RSI, trend signal, and a `divergence_flag` (sentiment and price moving opposite directions - the actually-interesting signal) with a plain-language summary line.

## Setup

```bash
cd marketpulse
npm install
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same values as levitatelabs' .env.local),
# and GROQ_API_KEY (same key used elsewhere in this project)
```

Run the schema once in the Supabase SQL editor: `db/schema.sql`.

## Running it daily

```bash
npm start
```

Takes a few minutes (RSS parsing + ~85 sequential Yahoo Finance calls + Groq scoring calls, all rate-limit-polite by design). Schedule it once a day with Windows Task Scheduler (or `cron` if running from WSL/Linux) - e.g. every morning before market open.

Individual steps can also be run on their own if you want to debug one stage:

```bash
npm run news         # RSS only
npm run market        # price data only (uses whatever's already active in `watchlist`)
npm run sentiment     # Groq sentiment scoring only
npm run technicals    # indicator computation only
npm run digest        # rebuild today's digest from what's already in the DB
```

## Notes

- All writes are idempotent (`upsert` on the natural key, or a unique constraint + insert that silently no-ops on conflict for `news_articles`) - safe to re-run the same day.
- If a Yahoo Finance or RSS request fails, that one ticker/feed is skipped and logged; the rest of the run continues.
- Reddit ingestion, option-chain data, and the charting widget are deliberately out of scope for this pass - see the original spec (`marketpulse.readme` in the parent folder) for the later phases if you want to extend this.
