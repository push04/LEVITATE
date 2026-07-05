import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";
import { GROQ_MODELS } from "../groq_models.js";

type UniverseEntry = { ticker: string; company_name: string; sector: string };

async function loadUniverse(supabase: ReturnType<typeof getSupabaseClient>): Promise<UniverseEntry[]> {
  const { data, error } = await supabase.from("nse_universe").select("ticker, company_name, sector");
  if (error) throw error;
  return (data ?? []) as UniverseEntry[];
}

const DEFAULT_BATCH_LIMIT = 60;

async function classify(
  apiKey: string,
  headline: string,
  summary: string,
  validTickers: Set<string>
): Promise<{ ticker: string | null; sector: string | null; sentiment: string; confidence: number; summary: string } | null> {
  const system = `You are a financial sentiment classifier for the Indian stock market. Given a news headline (and optional summary), identify:
1. The single most relevant NSE ticker it relates to, ONLY if it is unambiguously and specifically about one company from Nifty/Sensex-listed large or mid caps (otherwise null — do not guess)
2. The sector it relates to (e.g. "Banking", "IT", "Energy", "Auto", or null if too general)
3. Sentiment: "bullish", "bearish", or "neutral" (from a stock-market investor's point of view)
4. Confidence: 0.0 to 1.0
5. A one-sentence plain-language summary

Respond ONLY in JSON, no prose: {"ticker": "RELIANCE" or null, "sector": "Energy" or null, "sentiment": "bullish", "confidence": 0.7, "summary": "..."}`;

  const user = `Headline: ${headline}\nSummary: ${summary || "(none)"}`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 300,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.status === 429) continue;
      if (!res.ok) continue;

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) continue;

      const parsed = JSON.parse(match[0]);
      const sentiment = ["bullish", "bearish", "neutral"].includes(parsed.sentiment) ? parsed.sentiment : "neutral";
      const ticker = typeof parsed.ticker === "string" && validTickers.has(parsed.ticker) ? parsed.ticker : null;

      return {
        ticker,
        sector: typeof parsed.sector === "string" ? parsed.sector.slice(0, 60) : null,
        sentiment,
        confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
        summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 300) : headline,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function scoreSentiment(): Promise<{ scored: number; skipped: number }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[sentiment_score] GROQ_API_KEY not set — skipping");
    return { scored: 0, skipped: 0 };
  }

  const supabase = getSupabaseClient();
  const universe = await loadUniverse(supabase);
  const validTickers = new Set(universe.map((u) => u.ticker));
  const limit = Number(process.env.SENTIMENT_BATCH_LIMIT ?? DEFAULT_BATCH_LIMIT);

  const { data: scoredIds } = await supabase.from("sentiment_scores").select("source_id");
  const alreadyScored = new Set((scoredIds ?? []).map((r) => r.source_id).filter(Boolean));

  let scored = 0;
  let skipped = 0;

  // News articles.
  const { data: newsCandidates, error: newsError } = await supabase
    .from("news_articles")
    .select("id, title, raw_summary")
    .order("published_at", { ascending: false })
    .limit(limit * 3); // over-fetch since some will already be scored
  if (newsError) throw newsError;

  const newsToScore = (newsCandidates ?? []).filter((c) => !alreadyScored.has(c.id)).slice(0, limit);
  for (const article of newsToScore) {
    const result = await classify(apiKey, article.title, article.raw_summary ?? "", validTickers);
    if (!result) {
      skipped++;
      continue;
    }
    const { error: insertError } = await supabase.from("sentiment_scores").insert({
      source_type: "news",
      source_id: article.id,
      ticker: result.ticker,
      sector: result.sector,
      sentiment: result.sentiment,
      confidence: result.confidence,
      summary: result.summary,
    });
    if (insertError) skipped++;
    else scored++;
  }

  // Reddit posts — same classifier, title + selftext in place of headline + summary.
  // Uses half the overall budget so news (generally higher-signal, lower-noise)
  // isn't crowded out by a much larger volume of Reddit chatter.
  const redditLimit = Math.floor(limit / 2);
  const { data: redditCandidates, error: redditError } = await supabase
    .from("reddit_posts")
    .select("id, title, selftext")
    .order("created_utc", { ascending: false })
    .limit(redditLimit * 3);
  if (redditError) throw redditError;

  const redditToScore = (redditCandidates ?? []).filter((c) => !alreadyScored.has(c.id)).slice(0, redditLimit);
  for (const post of redditToScore) {
    const result = await classify(apiKey, post.title, post.selftext ?? "", validTickers);
    if (!result) {
      skipped++;
      continue;
    }
    const { error: insertError } = await supabase.from("sentiment_scores").insert({
      source_type: "reddit",
      source_id: post.id,
      ticker: result.ticker,
      sector: result.sector,
      sentiment: result.sentiment,
      confidence: result.confidence,
      summary: result.summary,
    });
    if (insertError) skipped++;
    else scored++;
  }

  console.log(`[sentiment_score] done — scored ${scored}, skipped ${skipped} (${newsToScore.length} news + ${redditToScore.length} reddit candidates)`);
  return { scored, skipped };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  scoreSentiment().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
