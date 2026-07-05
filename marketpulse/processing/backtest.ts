import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";
import { analyzeTechnicals } from "./technical_analysis.js";
import { outcomeFor } from "./evaluate_predictions.js";

const TARGET_DAYS = 7;

type PriceRow = { date: string; close: number; high: number; low: number; volume: number };
type TechRow = {
  date: string;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  atr_14: number | null;
  adx_14: number | null;
  obv: number | null;
  obv_sma_20: number | null;
  stoch_k: number | null;
  stoch_d: number | null;
  cci_20: number | null;
  williams_r_14: number | null;
};

// Validates the exact same deterministic signal logic (technical_analysis.ts)
// against real, already-ingested history — not a live prediction, a check of
// "if we'd been running this every day for the past year, how often would
// the signal have been right?" Uses whatever's already in price_data /
// technical_indicators; doesn't pull anything new.
export async function runBacktest(): Promise<{ overallAccuracyPct: number | null; totalSignals: number }> {
  const supabase = getSupabaseClient();

  const { data: watchlist } = await supabase.from("watchlist").select("ticker");
  const tickers = (watchlist ?? []).map((w) => w.ticker as string);

  const tally = {
    bullish: { correct: 0, total: 0 },
    bearish: { correct: 0, total: 0 },
    neutral: { correct: 0, total: 0 },
  };
  let totalSignals = 0;

  for (const ticker of tickers) {
    const [{ data: prices }, { data: technicals }] = await Promise.all([
      supabase.from("price_data").select("date, close, high, low, volume").eq("ticker", ticker).order("date", { ascending: true }),
      supabase.from("technical_indicators").select("*").eq("ticker", ticker).order("date", { ascending: true }),
    ]);

    if (!prices || !technicals || prices.length < 30 || technicals.length < 30) continue;

    const priceByDate = new Map<string, PriceRow>((prices as PriceRow[]).map((p) => [p.date, p]));
    const priceDates = (prices as PriceRow[]).map((p) => p.date);
    const techRows = technicals as TechRow[];

    for (const tech of techRows) {
      const idx = priceDates.indexOf(tech.date);
      if (idx < 20) continue; // need 20 prior days for avgVolume20/priceChangePct context

      const current = priceByDate.get(tech.date);
      const previous = priceByDate.get(priceDates[idx - 1]);
      if (!current || !previous || !previous.close) continue;

      const priceChangePct = Math.round(((current.close - previous.close) / previous.close) * 10000) / 100;
      const last20 = priceDates.slice(Math.max(0, idx - 19), idx + 1).map((d) => priceByDate.get(d)!);
      const avgVolume20 = last20.reduce((sum, r) => sum + (r.volume ?? 0), 0) / last20.length;
      const yearSlice = priceDates.slice(Math.max(0, idx - 251), idx + 1).map((d) => priceByDate.get(d)!);
      const high52w = yearSlice.reduce((max, r) => Math.max(max, r.high ?? -Infinity), -Infinity);
      const low52w = yearSlice.reduce((min, r) => Math.min(min, r.low ?? Infinity), Infinity);

      const read = analyzeTechnicals({
        close: current.close,
        rsi14: tech.rsi_14,
        macd: tech.macd,
        macdSignal: tech.macd_signal,
        sma20: tech.sma_20,
        sma50: tech.sma_50,
        sma200: tech.sma_200,
        bbUpper: tech.bb_upper,
        bbLower: tech.bb_lower,
        atr14: tech.atr_14,
        adx14: tech.adx_14,
        obv: tech.obv,
        obvSma20: tech.obv_sma_20,
        stochK: tech.stoch_k,
        stochD: tech.stoch_d,
        cci20: tech.cci_20,
        williamsR14: tech.williams_r_14,
        priceChangePct,
        volume: current.volume,
        avgVolume20,
        high52w: Number.isFinite(high52w) ? high52w : null,
        low52w: Number.isFinite(low52w) ? low52w : null,
      });

      // Find the actual price >= TARGET_DAYS calendar days later to check
      // the outcome — same "nearest trading day at/after target" approach
      // evaluate_predictions.ts uses for live predictions.
      const targetDate = new Date(tech.date);
      targetDate.setUTCDate(targetDate.getUTCDate() + TARGET_DAYS);
      const targetDateStr = targetDate.toISOString().slice(0, 10);
      const futureIdx = priceDates.findIndex((d) => d >= targetDateStr);
      if (futureIdx === -1) continue; // not enough future history yet (recent signals)

      const futurePrice = priceByDate.get(priceDates[futureIdx])!;
      const futureChangePct = Math.round(((futurePrice.close - current.close) / current.close) * 10000) / 100;
      const outcome = outcomeFor(read.trendSignal, futureChangePct);

      const bucket = tally[read.trendSignal];
      bucket.total++;
      if (outcome === "correct") bucket.correct++;
      totalSignals++;
    }
  }

  const totalCorrect = tally.bullish.correct + tally.bearish.correct + tally.neutral.correct;
  const overallAccuracyPct = totalSignals > 0 ? Math.round((totalCorrect / totalSignals) * 1000) / 10 : null;

  const { error: insertError } = await supabase.from("backtest_runs").insert({
    target_days: TARGET_DAYS,
    total_signals: totalSignals,
    bullish_correct: tally.bullish.correct,
    bullish_total: tally.bullish.total,
    bearish_correct: tally.bearish.correct,
    bearish_total: tally.bearish.total,
    neutral_correct: tally.neutral.correct,
    neutral_total: tally.neutral.total,
    overall_accuracy_pct: overallAccuracyPct,
    notes: `Backtested against ${tickers.length} watchlist tickers' full available history.`,
  });
  if (insertError) console.warn("[backtest] failed to store run:", insertError.message);

  console.log(
    `[backtest] ${totalSignals} historical signals checked — overall accuracy ${overallAccuracyPct ?? "n/a"}% ` +
      `(bullish ${tally.bullish.correct}/${tally.bullish.total}, bearish ${tally.bearish.correct}/${tally.bearish.total}, neutral ${tally.neutral.correct}/${tally.neutral.total})`
  );

  return { overallAccuracyPct, totalSignals };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBacktest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
