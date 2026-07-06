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

const CORE_TECHNICAL_COLUMNS = "rsi_14, macd, macd_signal, sma_20, sma_50, sma_200, bb_upper, bb_lower, atr_14, adx_14, obv, obv_sma_20, stoch_k, stoch_d";
const ADVANCED_TECHNICAL_COLUMNS = "cci_20, williams_r_14";

export async function buildDigest(): Promise<{ tickersInDigest: number; divergences: number }> {
  const supabase = getSupabaseClient();
  const digestDate = today();

  // Checked once, not per-ticker - avoids every single ticker's technicals
  // query silently failing (and previously, silently being swallowed) if
  // marketpulse/db/more_technicals.sql hasn't been run yet.
  const { error: advancedColumnsProbe } = await supabase.from("technical_indicators").select(ADVANCED_TECHNICAL_COLUMNS).limit(1);
  const hasAdvancedTechnicals = !advancedColumnsProbe;
  if (!hasAdvancedTechnicals) {
    console.warn("[digest] cci_20/williams_r_14 columns not found - run marketpulse/db/more_technicals.sql to enable them. Using core technicals only for now.");
  }
  const technicalSelectColumns = hasAdvancedTechnicals ? `${CORE_TECHNICAL_COLUMNS}, ${ADVANCED_TECHNICAL_COLUMNS}` : CORE_TECHNICAL_COLUMNS;

  // Each optional daily_digest column group is added by its own migration
  // file and may land independently of the others - probe each one
  // separately rather than an all-or-nothing "does the upsert fail at all"
  // check, so e.g. insider_trades.sql being applied doesn't get its columns
  // silently dropped just because richer_metrics.sql hasn't run yet too.
  async function probeColumns(cols: string): Promise<boolean> {
    const { error: probeError } = await supabase.from("daily_digest").select(cols).limit(1);
    return !probeError;
  }
  const [hasInsiderColumns, hasFundamentalsColumns, hasPersistenceColumn, hasRicherMetrics, hasStructuredFindings] = await Promise.all([
    probeColumns("insider_buy_count_30d, insider_sell_count_30d"),
    probeColumns("analyst_target_mean_price, analyst_recommendation_key"),
    probeColumns("raw_trend_signal"),
    probeColumns("current_price, macd, macd_signal, sma_20, sma_50, adx_14, atr_14, stoch_k, cci_20, williams_r_14, volume, avg_volume_20, high_52w, low_52w"),
    probeColumns("signal_findings, risk_findings"),
  ]);
  const missingMigrations: string[] = [];
  if (!hasInsiderColumns) missingMigrations.push("marketpulse/db/insider_trades.sql");
  if (!hasFundamentalsColumns) missingMigrations.push("marketpulse/db/fundamentals.sql");
  if (!hasPersistenceColumn) missingMigrations.push("marketpulse/db/signal_persistence.sql");
  if (!hasRicherMetrics) missingMigrations.push("marketpulse/db/richer_metrics.sql");
  if (!hasStructuredFindings) missingMigrations.push("marketpulse/db/structured_findings.sql");
  if (missingMigrations.length > 0) {
    console.warn(`[digest] some optional columns not found - run ${missingMigrations.join(", ")} to enable them. Digest saved without them for now.`);
  }

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

  // Informational only for now - surfaced per-ticker below, not yet part of
  // trend_signal scoring (not enough accumulated history yet to backtest
  // whether it predicts anything, unlike the price technicals).
  const insiderSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: recentInsiderTrades } = await supabase
    .from("insider_trades")
    .select("ticker, transaction_type")
    .gte("transaction_date", insiderSince);
  const insiderCountsByTicker = new Map<string, { buy: number; sell: number }>();
  for (const t of recentInsiderTrades ?? []) {
    const counts = insiderCountsByTicker.get(t.ticker as string) ?? { buy: 0, sell: 0 };
    if (t.transaction_type === "Buy") counts.buy++;
    else if (t.transaction_type === "Sell") counts.sell++;
    insiderCountsByTicker.set(t.ticker as string, counts);
  }

  // Same informational-only status as insider trades above - Yahoo only
  // gives current-snapshot fundamentals, not a historical series, so there's
  // nothing to backtest against yet.
  const { data: fundamentalsRows } = await supabase
    .from("fundamentals")
    .select("ticker, analyst_target_mean_price, analyst_recommendation_key");
  const fundamentalsByTicker = new Map((fundamentalsRows ?? []).map((f) => [f.ticker as string, f]));

  // Signal persistence: backtesting showed requiring the same raw signal to
  // hold for 2 consecutive days (not act on a single-day blip) measurably
  // improves accuracy. Compare against yesterday's RAW signal specifically -
  // comparing against yesterday's already-persistence-adjusted signal would
  // make a real multi-day trend never re-confirm once it first got dropped
  // to neutral for lacking a prior day to compare against.
  const { data: mostRecentPriorDateRow } = await supabase
    .from("daily_digest")
    .select("digest_date")
    .lt("digest_date", digestDate)
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const priorRawSignalByTicker = new Map<string, string>();
  if (mostRecentPriorDateRow?.digest_date) {
    const { data: priorRows } = await supabase
      .from("daily_digest")
      .select("ticker, raw_trend_signal")
      .eq("digest_date", mostRecentPriorDateRow.digest_date as string);
    for (const r of priorRows ?? []) {
      if (r.raw_trend_signal) priorRawSignalByTicker.set(r.ticker as string, r.raw_trend_signal as string);
    }
  }

  let tickersInDigest = 0;
  let divergences = 0;
  const rows: Array<Record<string, unknown>> = [];
  const predictions: Array<Record<string, unknown>> = [];

  for (const w of watchlist ?? []) {
    const ticker = w.ticker as string;

    // Up to a year of history in one query - covers the day-over-day change,
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

    const { data: latestTechnicalRaw, error: technicalError } = await supabase
      .from("technical_indicators")
      .select(technicalSelectColumns)
      .eq("ticker", ticker)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (technicalError) {
      console.warn(`[digest] ${ticker}: failed to load technicals, skipping:`, technicalError.message);
      continue;
    }
    // Dynamic select-string means supabase-js can't statically infer the row
    // shape (falls back to a ParserError type) - cast to the shape we know
    // it has at runtime given technicalSelectColumns above.
    const latestTechnical = latestTechnicalRaw as Record<string, number | null> | null;

    const sentimentRows = sentimentByTicker.get(ticker) ?? [];
    const { trend, avgConfidence } = dominantSentiment(sentimentRows);

    const divergenceFlag =
      priceChangePct != null &&
      ((trend === "bearish" && priceChangePct > DIVERGENCE_PRICE_THRESHOLD_PCT) ||
        (trend === "bullish" && priceChangePct < -DIVERGENCE_PRICE_THRESHOLD_PCT));

    if (divergenceFlag) divergences++;

    // Primary analysis engine: deterministic, computed from real technicals -
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

    const priorRawSignal = priorRawSignalByTicker.get(ticker);
    const effectiveTrendSignal =
      technicalRead.trendSignal !== "neutral" && technicalRead.trendSignal !== priorRawSignal ? "neutral" : technicalRead.trendSignal;

    const priceDirection = priceChangePct == null ? "flat" : priceChangePct > 0 ? "up" : priceChangePct < 0 ? "down" : "flat";
    const summary = divergenceFlag
      ? `News sentiment is ${trend} on ${ticker} while the price is ${priceDirection} ${Math.abs(priceChangePct ?? 0)}% - worth a second look.`
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
      trend_signal: effectiveTrendSignal,
      divergence_flag: divergenceFlag,
      summary_text: summary,
      detailed_analysis: technicalRead.outlook,
      risk_notes: technicalRead.riskNotes,
      risk_level: technicalRead.riskLevel,
      published: existingPublished.get(ticker) ?? (publishMode === "auto"),
      ...(hasPersistenceColumn ? { raw_trend_signal: technicalRead.trendSignal } : {}),
      ...(hasInsiderColumns
        ? {
            insider_buy_count_30d: insiderCountsByTicker.get(ticker)?.buy ?? 0,
            insider_sell_count_30d: insiderCountsByTicker.get(ticker)?.sell ?? 0,
          }
        : {}),
      ...(hasFundamentalsColumns
        ? {
            analyst_target_mean_price: fundamentalsByTicker.get(ticker)?.analyst_target_mean_price ?? null,
            analyst_recommendation_key: fundamentalsByTicker.get(ticker)?.analyst_recommendation_key ?? null,
          }
        : {}),
      ...(hasRicherMetrics
        ? {
            current_price: latest.close,
            macd: latestTechnical?.macd ?? null,
            macd_signal: latestTechnical?.macd_signal ?? null,
            sma_20: latestTechnical?.sma_20 ?? null,
            sma_50: latestTechnical?.sma_50 ?? null,
            adx_14: latestTechnical?.adx_14 ?? null,
            atr_14: latestTechnical?.atr_14 ?? null,
            stoch_k: latestTechnical?.stoch_k ?? null,
            cci_20: latestTechnical?.cci_20 ?? null,
            williams_r_14: latestTechnical?.williams_r_14 ?? null,
            volume: latest.volume ?? null,
            avg_volume_20: avgVolume20,
            high_52w: Number.isFinite(high52w) ? high52w : null,
            low_52w: Number.isFinite(low52w) ? low52w : null,
          }
        : {}),
      ...(hasStructuredFindings
        ? {
            signal_findings: technicalRead.findings,
            risk_findings: technicalRead.riskFindings,
          }
        : {}),
    });
    tickersInDigest++;

    // Record today's signal as a checkable prediction - evaluated
    // automatically by processing/evaluate_predictions.ts once
    // PREDICTION_TARGET_DAYS have passed. This is what the accuracy track
    // record is built from; nothing here is asserted without being checked.
    predictions.push({
      ticker,
      company_name: w.company_name,
      prediction_date: digestDate,
      signal: effectiveTrendSignal,
      price_at_prediction: latest.close,
      target_days: PREDICTION_TARGET_DAYS,
      target_date: addDays(digestDate, PREDICTION_TARGET_DAYS),
    });
  }

  if (rows.length > 0) {
    // Each row only includes columns already confirmed to exist (probed
    // above), so this should never hit a "column not found" error.
    const { error: upsertError } = await supabase.from("daily_digest").upsert(rows, { onConflict: "digest_date,ticker" });
    if (upsertError) throw upsertError;
  }

  if (predictions.length > 0) {
    const { error: predictionError } = await supabase.from("predictions").upsert(predictions, { onConflict: "ticker,prediction_date" });
    if (predictionError) console.warn("[digest] failed to record predictions:", predictionError.message);
  }

  console.log(`[digest] done - ${tickersInDigest} tickers in today's digest, ${divergences} divergence(s) flagged, publish mode: ${publishMode}`);
  return { tickersInDigest, divergences };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildDigest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
