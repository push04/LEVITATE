import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";
import { GROQ_MODELS } from "../groq_models.js";
import { findMarketMovers } from "./market_movers.js";

type UniverseEntry = {
  ticker: string;
  yahoo_symbol: string;
  company_name: string;
  sector: string;
  pinned: boolean;
};

const MAX_NEWS_FOR_PROMPT = 150;
const MAX_TRENDING_PICKS = 30;
// Groq extracts candidate tickers per chunk from its own knowledge (no
// universe list in the prompt - with ~500 real NSE tickers now, embedding
// the whole list in every call would itself risk HTTP 413 again). Every
// candidate gets validated against the real nse_universe table afterward,
// so a hallucinated/incorrect ticker is simply dropped, never trusted blind.
const HEADLINES_PER_CHUNK = 40;
// Market movers are recomputed fresh every day, so a ticker not re-confirmed
// within a few days genuinely isn't moving/trending anymore - a long window
// here would let the active set grow unbounded (and with it, technicals +
// Groq sentiment scoring cost) since a different set of movers gets selected
// each day.
const STALE_AFTER_DAYS = 4;

async function loadUniverse(): Promise<UniverseEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("nse_universe").select("ticker, yahoo_symbol, company_name, sector, pinned");
  if (error) throw error;
  return (data ?? []) as UniverseEntry[];
}

async function askGroqForTickersInChunk(headlines: string[]): Promise<Array<{ ticker: string; reason: string }>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || headlines.length === 0) return [];

  const system = `You are a financial news analyst for the Indian stock market (NSE). Given a batch of recent news headlines, identify any specific NSE-listed companies that are prominently mentioned or central to a major event (results, regulatory action, big deal, notable price move).

Rules:
- Return the company's actual NSE ticker symbol (uppercase, as traded on NSE - e.g. RELIANCE, TCS, INFY, HDFCBANK). Only include a ticker if you are confident it is the correct, real NSE symbol for that company; if you're not sure of the exact symbol, omit it rather than guessing.
- Do not include general market commentary, indices, or vague sector mentions - only specific, named companies.
- Return at most ${MAX_TRENDING_PICKS} tickers, ranked most-prominent first.
- Respond ONLY with a JSON array, no prose: [{"ticker": "RELIANCE", "reason": "one short phrase on why it's in the news"}, ...]`;

  const user = `RECENT HEADLINES:\n${headlines.map((h) => `- ${h}`).join("\n")}`;

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
          max_tokens: 1500,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 429) {
        console.warn(`[watchlist_update] ${model} rate limited, trying next model`);
        continue;
      }
      if (res.status === 413) {
        console.warn(`[watchlist_update] ${model} HTTP 413 (payload too large) even for one chunk, trying next model`);
        continue;
      }
      if (!res.ok) {
        console.warn(`[watchlist_update] ${model} HTTP ${res.status}, trying next model`);
        continue;
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) {
        console.warn(`[watchlist_update] ${model} returned no parseable JSON array (got ${content.length} chars), trying next model`);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.warn(`[watchlist_update] ${model} returned malformed JSON (likely truncated), trying next model`);
        continue;
      }
      if (!Array.isArray(parsed)) continue;

      return parsed
        .filter((p) => p && typeof p.ticker === "string")
        .map((p) => ({ ticker: (p.ticker as string).toUpperCase().trim(), reason: String(p.reason ?? "").slice(0, 200) }));
    } catch (err) {
      console.warn(`[watchlist_update] ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return [];
}

// Processes headlines in small chunks - send some, merge the result, move to
// the next chunk - rather than one giant prompt. Every candidate ticker Groq
// returns is validated against the real nse_universe table before use; this
// function itself does zero validation, that happens in updateWatchlist().
async function askGroqForTrendingTickers(headlines: string[]): Promise<Array<{ ticker: string; reason: string }>> {
  if (!process.env.GROQ_API_KEY || headlines.length === 0) return [];

  const merged = new Map<string, string>(); // ticker -> reason (first-seen wins)

  for (let i = 0; i < headlines.length; i += HEADLINES_PER_CHUNK) {
    const chunk = headlines.slice(i, i + HEADLINES_PER_CHUNK);
    const chunkResults = await askGroqForTickersInChunk(chunk);
    for (const r of chunkResults) {
      if (!merged.has(r.ticker)) merged.set(r.ticker, r.reason);
    }
    console.log(`[watchlist_update] chunk ${Math.floor(i / HEADLINES_PER_CHUNK) + 1}/${Math.ceil(headlines.length / HEADLINES_PER_CHUNK)}: ${chunkResults.length} tickers found, ${merged.size} unique so far`);
  }

  return Array.from(merged.entries()).map(([ticker, reason]) => ({ ticker, reason }));
}

export async function updateWatchlist(): Promise<{ active: number; trending: number; pruned: number }> {
  const supabase = getSupabaseClient();
  const universe = await loadUniverse();
  const universeByTicker = new Map(universe.map((u) => [u.ticker, u]));
  const validTickers = new Set(universe.map((u) => u.ticker));

  // 1. Always upsert pinned entries (indices) as active.
  const pinned = universe.filter((u) => u.pinned);
  for (const p of pinned) {
    await supabase.from("watchlist").upsert(
      {
        ticker: p.ticker,
        yahoo_symbol: p.yahoo_symbol,
        company_name: p.company_name,
        sector: p.sector,
        pinned: true,
        active: true,
        trend_reason: "Core benchmark index",
        last_confirmed_at: new Date().toISOString(),
      },
      { onConflict: "ticker" }
    );
  }

  // 2. Pull recent headlines to ask Groq what's trending.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentNews } = await supabase
    .from("news_articles")
    .select("title")
    .gte("ingested_at", since)
    .order("ingested_at", { ascending: false })
    .limit(MAX_NEWS_FOR_PROMPT);

  const headlines = (recentNews ?? []).map((n) => n.title as string);
  const groqCandidates = await askGroqForTrendingTickers(headlines);
  // Validate every Groq-suggested ticker against the real, NSE-sourced
  // universe - anything Groq got wrong (hallucinated or misremembered) is
  // silently dropped here, never trusted blind.
  const trending = groqCandidates
    .filter((t) => validTickers.has(t.ticker))
    .slice(0, MAX_TRENDING_PICKS);
  console.log(`[watchlist_update] Groq suggested ${groqCandidates.length} tickers from ${headlines.length} headlines, ${trending.length} validated against the real NSE universe`);

  // 3. Real, objective market movers - top gainers/losers/most-active by
  // actual price change % and volume across the full universe (populated by
  // ingestion/market_data_pull.ts, which pulls the whole universe, not just
  // today's watchlist). No hand-picked tickers anywhere in this selection.
  const movers = await findMarketMovers();
  const moverList = [...movers.gainers, ...movers.losers, ...movers.mostActive];

  // 4. The active watchlist is the union of real market movers and Groq's
  // news-trending picks - nothing here is a fixed/hardcoded list.
  const tickersToActivate = new Map<string, string>(); // ticker -> reason
  for (const m of moverList) tickersToActivate.set(m.ticker, m.reason);
  for (const t of trending) tickersToActivate.set(t.ticker, t.reason || "Trending in recent news");

  let activated = 0;
  for (const [ticker, reason] of tickersToActivate) {
    const entry = universeByTicker.get(ticker);
    if (!entry) continue;
    const { error } = await supabase.from("watchlist").upsert(
      {
        ticker: entry.ticker,
        yahoo_symbol: entry.yahoo_symbol,
        company_name: entry.company_name,
        sector: entry.sector,
        pinned: false,
        active: true,
        trend_reason: reason,
        last_confirmed_at: new Date().toISOString(),
      },
      { onConflict: "ticker" }
    );
    if (!error) activated++;
  }

  // 5. Prune tickers that have not been confirmed trending/mover in a while.
  const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: pruned } = await supabase
    .from("watchlist")
    .update({ active: false })
    .eq("pinned", false)
    .eq("active", true)
    .lt("last_confirmed_at", staleCutoff)
    .select("ticker");

  const prunedCount = pruned?.length ?? 0;
  if (prunedCount > 0) {
    console.log(`[watchlist_update] pruned ${prunedCount} stale tickers: ${pruned!.map((p) => p.ticker).join(", ")}`);
  }

  const { count: activeCount } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  console.log(`[watchlist_update] done - ${activeCount ?? 0} active tickers (${activated} confirmed this run)`);
  return { active: activeCount ?? 0, trending: trending.length, pruned: prunedCount };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  updateWatchlist().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
