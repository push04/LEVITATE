import "dotenv/config";
import { pathToFileURL } from "node:url";
import https from "node:https";
import { getSupabaseClient } from "../db/supabase_client.js";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
// Fundamentals move slowly (quarterly results, gradual analyst revisions) —
// no need to re-hit Yahoo every 2-3 hour run. Same resync-guard pattern as
// universe_sync.ts, just on a much longer cycle.
const RESYNC_INTERVAL_HOURS = 48;
const CONCURRENCY = 5;

function httpsGet(url: string, headers: Record<string, string>, timeoutMs = 12000): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: timeoutMs, family: 4 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", reject);
  });
}

async function getCrumb(): Promise<{ crumb: string; cookie: string }> {
  const cookieRes = await httpsGet("https://fc.yahoo.com", { "User-Agent": USER_AGENT });
  const setCookie = cookieRes.headers["set-cookie"];
  const cookie = setCookie ? (Array.isArray(setCookie) ? setCookie : [setCookie]).map((c) => c.split(";")[0]).join("; ") : "";
  const crumbRes = await httpsGet("https://query1.finance.yahoo.com/v1/test/getcrumb", { "User-Agent": USER_AGENT, Cookie: cookie });
  if (crumbRes.status !== 200) throw new Error(`getcrumb HTTP ${crumbRes.status}`);
  return { crumb: crumbRes.body.trim(), cookie };
}

function num(field: { raw?: number } | undefined): number | null {
  return typeof field?.raw === "number" ? field.raw : null;
}

async function fetchFundamentals(yahooSymbol: string, crumb: string, cookie: string) {
  const modules = "financialData,defaultKeyStatistics";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
  const res = await httpsGet(url, { "User-Agent": USER_AGENT, Cookie: cookie });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const json = JSON.parse(res.body);
  const result = json.quoteSummary?.result?.[0];
  if (!result) return null;

  const fd = result.financialData ?? {};
  const ks = result.defaultKeyStatistics ?? {};

  return {
    pe_forward: num(ks.forwardPE),
    profit_margin: num(fd.profitMargins),
    return_on_equity: num(fd.returnOnEquity),
    return_on_assets: num(fd.returnOnAssets),
    debt_to_equity: num(fd.debtToEquity),
    current_ratio: num(fd.currentRatio),
    revenue_growth: num(fd.revenueGrowth),
    earnings_growth: num(fd.earningsGrowth),
    gross_margin: num(fd.grossMargins),
    operating_margin: num(fd.operatingMargins),
    analyst_target_mean_price: num(fd.targetMeanPrice),
    analyst_recommendation_mean: num(fd.recommendationMean),
    analyst_recommendation_key: fd.recommendationKey ?? null,
    number_of_analyst_opinions: num(fd.numberOfAnalystOpinions),
    held_percent_insiders: num(ks.heldPercentInsiders),
    held_percent_institutions: num(ks.heldPercentInstitutions),
    beta: num(ks.beta),
  };
}

export async function pullFundamentals(): Promise<{ updated: number; skippedRecent: boolean }> {
  const supabase = getSupabaseClient();

  const { data: mostRecent } = await supabase.from("fundamentals").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (mostRecent?.updated_at) {
    const hoursSince = (Date.now() - new Date(mostRecent.updated_at).getTime()) / (60 * 60 * 1000);
    if (hoursSince < RESYNC_INTERVAL_HOURS) {
      console.log(`[fundamentals_pull] synced ${hoursSince.toFixed(1)}h ago (< ${RESYNC_INTERVAL_HOURS}h) — skipping`);
      return { updated: 0, skippedRecent: true };
    }
  }

  const { data: watchlist } = await supabase.from("watchlist").select("ticker, yahoo_symbol").eq("active", true);
  const tickers = (watchlist ?? []).filter((w) => w.yahoo_symbol && !(w.yahoo_symbol as string).startsWith("^"));

  let crumb: string, cookie: string;
  try {
    ({ crumb, cookie } = await getCrumb());
  } catch (err) {
    console.warn("[fundamentals_pull] failed to get Yahoo crumb, skipping this run:", err instanceof Error ? err.message : err);
    return { updated: 0, skippedRecent: false };
  }

  let updated = 0;
  for (let i = 0; i < tickers.length; i += CONCURRENCY) {
    const batch = tickers.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (w) => {
        const data = await fetchFundamentals(w.yahoo_symbol as string, crumb, cookie);
        if (!data) return;
        const { error } = await supabase.from("fundamentals").upsert(
          { ticker: w.ticker, ...data, updated_at: new Date().toISOString() },
          { onConflict: "ticker" }
        );
        if (error) throw error;
        updated++;
      })
    );
    for (const r of results) {
      if (r.status === "rejected") console.warn("[fundamentals_pull] ticker failed:", r.reason instanceof Error ? r.reason.message : r.reason);
    }
  }

  console.log(`[fundamentals_pull] done — ${updated}/${tickers.length} tickers updated`);
  return { updated, skippedRecent: false };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  pullFundamentals().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
