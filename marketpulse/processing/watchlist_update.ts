import "dotenv/config";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getSupabaseClient } from "../db/supabase_client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type UniverseEntry = {
  ticker: string;
  yahoo_symbol: string;
  company_name: string;
  sector: string;
  pinned?: boolean;
  aliases?: string[];
};

// Always-on floor so the watchlist stays meaningfully diversified even on a
// day Groq's trend pick comes back thin (rate-limited, empty news window,
// parse failure, etc.) — these are never removed by the pruning step below.
const BASELINE_TICKERS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC",
  "HINDUNILVR", "BHARTIARTL", "LT", "TATAMOTORS", "MARUTI", "SUNPHARMA",
  "BAJFINANCE", "ASIANPAINT",
];

const MAX_NEWS_FOR_PROMPT = 150;
const MAX_TRENDING_PICKS = 30;
const STALE_AFTER_DAYS = 14;

function loadUniverse(): UniverseEntry[] {
  const raw = readFileSync(path.join(__dirname, "..", "config", "nse_universe.json"), "utf-8");
  return JSON.parse(raw);
}

async function askGroqForTrendingTickers(
  universe: UniverseEntry[],
  headlines: string[]
): Promise<Array<{ ticker: string; reason: string }>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || headlines.length === 0) return [];

  const universeList = universe
    .filter((u) => !u.pinned)
    .map((u) => `${u.ticker} — ${u.company_name}${u.aliases?.length ? ` (aka ${u.aliases.join(", ")})` : ""}`)
    .join("\n");

  const system = `You are a financial news analyst for the Indian stock market. You will be given a list of recent news headlines and a fixed universe of valid NSE ticker symbols. Identify which tickers from the universe are being discussed prominently or repeatedly in the headlines right now — i.e. which companies are "trending" in the news today.

Rules:
- ONLY return tickers that appear verbatim in the provided universe list. Never invent a ticker that isn't in the list.
- A ticker counts as trending if it (or its company name / alias) is mentioned in one or more headlines, or is central to a major event (results, regulatory action, big deal, price movement) referenced in the headlines.
- Return at most ${MAX_TRENDING_PICKS} tickers, ranked most-trending first.
- Respond ONLY with a JSON array, no prose: [{"ticker": "RELIANCE", "reason": "one short phrase on why it's trending"}, ...]`;

  const user = `UNIVERSE:\n${universeList}\n\nRECENT HEADLINES:\n${headlines.map((h) => `- ${h}`).join("\n")}`;

  const models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
  for (const model of models) {
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
      if (!res.ok) {
        console.warn(`[watchlist_update] ${model} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) continue;

      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) continue;

      const validTickers = new Set(universe.map((u) => u.ticker));
      return parsed
        .filter((p) => p && typeof p.ticker === "string" && validTickers.has(p.ticker))
        .slice(0, MAX_TRENDING_PICKS)
        .map((p) => ({ ticker: p.ticker, reason: String(p.reason ?? "").slice(0, 200) }));
    } catch (err) {
      console.warn(`[watchlist_update] ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return [];
}

export async function updateWatchlist(): Promise<{ active: number; trending: number; pruned: number }> {
  const supabase = getSupabaseClient();
  const universe = loadUniverse();
  const universeByTicker = new Map(universe.map((u) => [u.ticker, u]));

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
  const trending = await askGroqForTrendingTickers(universe, headlines);
  console.log(`[watchlist_update] Groq flagged ${trending.length} trending tickers from ${headlines.length} headlines`);

  // 3. Upsert baseline + trending picks as active.
  const tickersToActivate = new Map<string, string>(); // ticker -> reason
  for (const t of BASELINE_TICKERS) tickersToActivate.set(t, "Baseline diversified coverage");
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

  // 4. Prune tickers that haven't been confirmed trending/baseline in a while.
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

  console.log(`[watchlist_update] done — ${activeCount ?? 0} active tickers (${activated} confirmed this run)`);
  return { active: activeCount ?? 0, trending: trending.length, pruned: prunedCount };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  updateWatchlist().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
