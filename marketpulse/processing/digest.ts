import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";
import { analyzeTechnicals } from "./technical_analysis.js";

const DIVERGENCE_PRICE_THRESHOLD_PCT = 2;
// How many trading days ahead each signal is "held accountable" for. Kept as
// a plain constant (not per-ticker configurable) so the accuracy track
// record stays apples-to-apples across every prediction.
const PREDICTION_TARGET_DAYS = 7;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dominantSentiment(scores: Array<{ sentiment: string; confidence: number }>): { trend: string; avgConfidence: number } {
  if (scores.length === 0) return { trend: "neutral", avgConfidence: 0 };
  const weights: Record<string, number> = { bullish: 0, bearish: 0, neutral: 0 };
  for (const s of scores) weights[s.sentiment] = (weights[s.sentiment] ?? 0) + s.confidence;
  const trend = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
  const avgConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length;
  return { trend, avgConfidence: Math.round(avgConfidence * 100) / 100 };
}

export async function buildDigest(): Promise<{ tickersInDigest: number; divergences: number }> {
  const supabase = getSupabaseClient();
  const digestDate = today();

  const { data: settings } = await supabase
    .from("market_pulse_settings")
    .select("publish_mode")
    .eq("id", true)
    .maybeSingle();
  const publishMode = settings?.publish_mode ?? "manual";

  // Preserve whatever an admin already chose to publish/unpublish today so a
  // re-run (e.g. sentiment scores landing later in the day) doesn't silently
  // revert their selection back to unpublished.
  const { data: existingRows } = await supabase
    .from("daily_digest")
    .select("ticker, published")
    .eq("digest_date", digestDate);
  const existingPublished = new Map((existingRows ?? []).map((r) => [r.ticker as string, r.published as boolean]));

  const { data: watchlist, error } = await supabase
    .from("watchlist")
    .select("ticker, company_name, sector")
    .eq("active", true);
  if (error) throw error;

  // Sentiment from the last 24h, joined back to tickers via sentiment_scores.ticker
  // (populated by sentiment_score.ts's Groq classification).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSentiment } = await supabase
    .from("sentiment_scores")
    .select("ticker, sentiment, confidence")
    .not("ticker", "is", null)
    .gte("scored_at", since);

  const sentimentByTicker = new Map<string, Array<{ sentiment: string; confidence: number }>>();
  for (const row of recentSentiment ?? []) {
    const list = sentimentByTicker.get(row.ticker as string) ?? [];
    list.push({ sentiment: row.sentiment as string, confidence: row.confidence as number });
    sentimentByTicker.set(row.ticker as string, list);
  }

  let tickersInDigest = 0;
  let divergences = 0;
  const rows: Array<Record<string, unknown>> = [];
  const predictions: Array<Record<string, unknown>> = [];

  for (const w of watchlist ?? []) {
    const ticker = w.ticker as string;

    // Up to a year of history in one query — covers the day-over-day change,
    // the 20-day average volume, and a real 52-week high/low, all from the
    // same dataset instead of three separate round-trips.
    const { data: yearPrices } = await supabase
      .from("price_data")
      .select("date, close, high, low, volume")
      .eq("ticker", ticker)
      .order("date", { ascending: false })
      .limit(252);

    if (!yearPrices || yearPrices.length < 2) continue; // need at least 2 days to compute a % change

    const [latest, previous] = yearPrices;
    const priceChangePct = previous.close ? Math.round(((latest.close - previous.close) / previous.close) * 10000) / 100 : null;

    const last20 = yearPrices.slice(0, 20);
    const avgVolume20 = last20.length > 0 ? last20.reduce((sum, r) => sum + (r.volume ?? 0), 0) / last20.length : null;
    const high52w = yearPrices.reduce((max, r) => Math.max(max, r.high ?? -Infinity), -Infinity);
    const low52w = yearPrices.reduce((min, r) => Math.min(min, r.low ?? Infinity), Infinity);

    const { data: latestTechnical } = await supabase
      .from("technical_indicators")
      .select("rsi_14, macd, macd_signal, sma_20, sma_50, sma_200, bb_upper, bb_lower, atr_14, adx_14, obv, obv_sma_20, stoch_k, stoch_d, cci_20, williams_r_14")
      .eq("ticker", ticker)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sentimentRows = sentimentByTicker.get(ticker) ?? [];
    const { trend, avgConfidence } = dominantSentiment(sentimentRows);

    const divergenceFlag =
      priceChangePct != null &&
      ((trend === "bearish" && priceChangePct > DIVERGENCE_PRICE_THRESHOLD_PCT) ||
        (trend === "bullish" && priceChangePct < -DIVERGENCE_PRICE_THRESHOLD_PCT));

    if (divergenceFlag) divergences++;

    // Primary analysis engine: deterministic, computed from real technicals —
    // not Groq. `trend` (from Groq's news sentiment) is kept as a separate,
    // secondary signal specifically to power the divergence check above.
    const technicalRead = analyzeTechnicals({
      close: latest.close,
      rsi14: latestTechnical?.rsi_14 ?? null,
      macd: latestTechnical?.macd ?? null,
      macdSignal: latestTechnical?.macd_signal ?? null,
      sma20: latestTechnical?.sma_20 ?? null,
      sma50: latestTechnical?.sma_50 ?? null,
      sma200: latestTechnical?.sma_200 ?? null,
      bbUpper: latestTechnical?.bb_upper ?? null,
      bbLower: latestTechnical?.bb_lower ?? null,
      atr14: latestTechnical?.atr_14 ?? null,
      adx14: latestTechnical?.adx_14 ?? null,
      obv: latestTechnical?.obv ?? null,
      obvSma20: latestTechnical?.obv_sma_20 ?? null,
      stochK: latestTechnical?.stoch_k ?? null,
      stochD: latestTechnical?.stoch_d ?? null,
      cci20: latestTechnical?.cci_20 ?? null,
      williamsR14: latestTechnical?.williams_r_14 ?? null,
      priceChangePct,
      volume: latest.volume ?? null,
      avgVolume20,
      high52w: Number.isFinite(high52w) ? high52w : null,
      low52w: Number.isFinite(low52w) ? low52w : null,
    });

    const priceDirection = priceChangePct == null ? "flat" : priceChangePct > 0 ? "up" : priceChangePct < 0 ? "down" : "flat";
    const summary = divergenceFlag
      ? `News sentiment is ${trend} on ${ticker} while the price is ${priceDirection} ${Math.abs(priceChangePct ?? 0)}% — worth a second look.`
      : `${ticker}: sentiment ${trend}${sentimentRows.length ? ` (${sentimentRows.length} recent ${sentimentRows.length === 1 ? "story" : "stories"})` : ""}, price ${priceDirection}${priceChangePct != null ? ` ${priceChangePct}%` : ""}.`;

    rows.push({
      digest_date: digestDate,
      ticker,
      company_name: w.company_name,
      sector: w.sector,
      sentiment_trend: trend,
      avg_confidence: avgConfidence,
      news_count: sentimentRows.length,
      price_change_pct: priceChangePct,
      rsi_14: latestTechnical?.rsi_14 ?? null,
      trend_signal: technicalRead.trendSignal,
      divergence_flag: divergenceFlag,
      summary_text: summary,
      detailed_analysis: technicalRead.outlook,
      risk_notes: technicalRead.riskNotes,
      risk_level: technicalRead.riskLevel,
      published: existingPublished.get(ticker) ?? (publishMode === "auto"),
    });
    tickersInDigest++;

    // Record today's signal as a checkable prediction — evaluated
    // automatically by processing/evaluate_predictions.ts once
    // PREDICTION_TARGET_DAYS have passed. This is what the accuracy track
    // record is built from; nothing here is asserted without being checked.
    predictions.push({
      ticker,
      company_name: w.company_name,
      prediction_date: digestDate,
      signal: technicalRead.trendSignal,
      price_at_prediction: latest.close,
      target_days: PREDICTION_TARGET_DAYS,
      target_date: addDays(digestDate, PREDICTION_TARGET_DAYS),
    });
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("daily_digest").upsert(rows, { onConflict: "digest_date,ticker" });
    if (upsertError) throw upsertError;
  }

  if (predictions.length > 0) {
    const { error: predictionError } = await supabase.from("predictions").upsert(predictions, { onConflict: "ticker,prediction_date" });
    if (predictionError) console.warn("[digest] failed to record predictions:", predictionError.message);
  }

  console.log(`[digest] done — ${tickersInDigest} tickers in today's digest, ${divergences} divergence(s) flagged, publish mode: ${publishMode}`);
  return { tickersInDigest, divergences };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildDigest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
