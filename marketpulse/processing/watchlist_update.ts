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

async function askGroqForTickersInChunk(headlines: string[]): Promise<Array<{ ticker: string; company: string; reason: string }>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || headlines.length === 0) return [];

  const system = `You are a financial news analyst for the Indian stock market (NSE). Given a batch of recent news headlines, identify any specific NSE-listed companies that are prominently mentioned or central to a major event (results, regulatory action, big deal, notable price move).

Rules:
- Return your best guess at the company's actual NSE ticker symbol (uppercase, as traded on NSE - e.g. RELIANCE, TCS, INFY, HDFCBANK) AND the company's name as written in the headline. The ticker is only a best guess - it gets verified separately against the real, official list of NSE symbols, so it is fine to be unsure of the exact symbol as long as the company name is accurate.
- Do not include general market commentary, indices, or vague sector mentions - only specific, named companies.
- Return at most ${MAX_TRENDING_PICKS} companies, ranked most-prominent first.
- Respond ONLY with a JSON array, no prose: [{"ticker": "RELIANCE", "company": "Reliance Industries", "reason": "one short phrase on why it's in the news"}, ...]`;

  const user = `RECENT HEADLINES:\n${headlines.map((h) => `- ${h}`).join("\n")}`;

  for (const model of GROQ_MODELS) {
    // With no fallback model to shift load to anymore, a 429 here means the
    // per-minute (not per-day) window on this one model - waiting a few
    // seconds and retrying the SAME model recovers it, rather than giving up
    // on the whole chunk immediately.
    for (let attempt = 1; attempt <= 3; attempt++) {
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
        if (attempt < 3) {
          const retryAfterSec = Number(res.headers.get("retry-after")) || attempt * 5;
          console.warn(`[watchlist_update] ${model} rate limited, waiting ${retryAfterSec}s before retry ${attempt}/2`);
          await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000));
          continue;
        }
        console.warn(`[watchlist_update] ${model} still rate limited after retries, giving up on this chunk`);
        break;
      }
      if (res.status === 413) {
        console.warn(`[watchlist_update] ${model} HTTP 413 (payload too large) even for one chunk`);
        break;
      }
      if (!res.ok) {
        console.warn(`[watchlist_update] ${model} HTTP ${res.status}`);
        break;
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) {
        console.warn(`[watchlist_update] ${model} returned no parseable JSON array (got ${content.length} chars)`);
        break;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.warn(`[watchlist_update] ${model} returned malformed JSON (likely truncated)`);
        break;
      }
      if (!Array.isArray(parsed)) break;

      return parsed
        .filter((p) => p && typeof p.ticker === "string")
        .map((p) => ({
          ticker: (p.ticker as string).toUpperCase().trim(),
          company: String(p.company ?? "").trim(),
          reason: String(p.reason ?? "").slice(0, 200),
        }));
    } catch (err) {
      console.warn(`[watchlist_update] ${model} failed:`, err instanceof Error ? err.message : err);
      break;
    }
    }
  }
  return [];
}

// Processes headlines in small chunks - send some, merge the result, move to
// the next chunk - rather than one giant prompt. Every candidate ticker Groq
// returns is validated against the real nse_universe table before use; this
// function itself does zero validation, that happens in updateWatchlist().
async function askGroqForTrendingTickers(headlines: string[]): Promise<Array<{ ticker: string; company: string; reason: string }>> {
  if (!process.env.GROQ_API_KEY || headlines.length === 0) return [];

  const merged = new Map<string, { company: string; reason: string }>(); // ticker -> {company, reason} (first-seen wins)

  for (let i = 0; i < headlines.length; i += HEADLINES_PER_CHUNK) {
    const chunk = headlines.slice(i, i + HEADLINES_PER_CHUNK);
    const chunkResults = await askGroqForTickersInChunk(chunk);
    for (const r of chunkResults) {
      if (!merged.has(r.ticker)) merged.set(r.ticker, { company: r.company, reason: r.reason });
    }
    console.log(`[watchlist_update] chunk ${Math.floor(i / HEADLINES_PER_CHUNK) + 1}/${Math.ceil(headlines.length / HEADLINES_PER_CHUNK)}: ${chunkResults.length} tickers found, ${merged.size} unique so far`);
  }

  return Array.from(merged.entries()).map(([ticker, v]) => ({ ticker, company: v.company, reason: v.reason }));
}

// Groq is asked to remember a ticker SYMBOL from its own training, which it
// often gets subtly wrong even for a real, well-known company (using the
// company's colloquial/full name instead - "MARUTISUZUKI" instead of the
// real "MARUTI", "VODAFONEIDEA" instead of "IDEA", "AUSSMALLFIN" instead of
// "AUBANK") - confirmed empirically against a real run's rejected list. The
// company NAME Groq extracts from the headline text tends to be far more
// reliable than its ticker recall, so this is a second, independent check
// against the real universe's own company_name column before giving up on a
// candidate - still fully verified against real data, never blind-trusted.
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(ltd|limited|inc|plc|the|company|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function companyNameMatches(candidateName: string, realName: string): boolean {
  const a = normalizeCompanyName(candidateName);
  const b = normalizeCompanyName(realName);
  if (!a || !b) return false;
  if (a === b) return true;
  // One name is a whole prefix/substring of the other (e.g. "Maruti Suzuki"
  // vs "Maruti Suzuki India") - require a reasonable minimum length so short
  // strings can't coincidentally "contain" an unrelated company's name.
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= 6 && longer.includes(shorter);
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
  // Validate every Groq-suggested company against the real, NSE-sourced
  // universe - anything Groq got wrong (hallucinated or misremembered) is
  // dropped, never trusted blind. Two independent checks against real data:
  // exact ticker match first, then (since Groq's remembered ticker symbol is
  // often subtly wrong even for a real company) a company-name match against
  // the universe's own company_name column as a second chance.
  const seenTickers = new Set<string>();
  const trending: Array<{ ticker: string; reason: string }> = [];
  let resolvedByName = 0;
  for (const c of groqCandidates) {
    if (validTickers.has(c.ticker)) {
      if (!seenTickers.has(c.ticker)) {
        seenTickers.add(c.ticker);
        trending.push({ ticker: c.ticker, reason: c.reason });
      }
      continue;
    }
    if (!c.company) continue;
    const match = universe.find((u) => companyNameMatches(c.company, u.company_name));
    if (match && !seenTickers.has(match.ticker)) {
      seenTickers.add(match.ticker);
      trending.push({ ticker: match.ticker, reason: c.reason || `Trending in recent news (matched via company name)` });
      resolvedByName++;
    }
  }
  trending.splice(MAX_TRENDING_PICKS);
  console.log(
    `[watchlist_update] Groq suggested ${groqCandidates.length} tickers from ${headlines.length} headlines, ${trending.length} validated against the real NSE universe (${resolvedByName} via company-name match after ticker mismatch)`
  );

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
