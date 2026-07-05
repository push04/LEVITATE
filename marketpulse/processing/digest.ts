import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";

const DIVERGENCE_PRICE_THRESHOLD_PCT = 2;

function today(): string {
  return new Date().toISOString().slice(0, 10);
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

  for (const w of watchlist ?? []) {
    const ticker = w.ticker as string;

    const { data: last2Prices } = await supabase
      .from("price_data")
      .select("date, close")
      .eq("ticker", ticker)
      .order("date", { ascending: false })
      .limit(2);

    if (!last2Prices || last2Prices.length < 2) continue; // need at least 2 days to compute a % change

    const [latest, previous] = last2Prices;
    const priceChangePct = previous.close ? Math.round(((latest.close - previous.close) / previous.close) * 10000) / 100 : null;

    const { data: latestTechnical } = await supabase
      .from("technical_indicators")
      .select("rsi_14, trend_signal")
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
      trend_signal: latestTechnical?.trend_signal ?? "neutral",
      divergence_flag: divergenceFlag,
      summary_text: summary,
    });
    tickersInDigest++;
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("daily_digest").upsert(rows, { onConflict: "digest_date,ticker" });
    if (upsertError) throw upsertError;
  }

  console.log(`[digest] done — ${tickersInDigest} tickers in today's digest, ${divergences} divergence(s) flagged`);
  return { tickersInDigest, divergences };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildDigest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
