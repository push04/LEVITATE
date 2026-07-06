import "dotenv/config";
import { pathToFileURL } from "node:url";
import https from "node:https";
import { getSupabaseClient } from "../db/supabase_client.js";

// Node's built-in `fetch` (undici) hangs indefinitely against NSE's archive
// server - reproduced cause: Node resolves/attempts IPv6 first by default,
// and IPv6 routing to this host is broken on at least some networks, so it
// hangs until timeout instead of falling back to IPv4 quickly (curl and
// browsers do proper Happy-Eyeballs fallback; Node's fetch doesn't here).
// Forcing `family: 4` on a plain `https` request sidesteps it entirely.
function fetchTextOnce(url: string, userAgent: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": userAgent }, timeout: timeoutMs, family: 4 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", reject);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// This endpoint is intermittently flaky from some networks (even with the
// IPv4 fix above) - a few retries with backoff is normal, sane behavior for
// a once-daily unattended script, independent of whatever the root cause of
// any given failure is.
async function fetchText(url: string, userAgent: string, attempts = 4): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchTextOnce(url, userAgent, 15000);
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        const delay = attempt * 3000;
        console.warn(`[universe_sync] fetch attempt ${attempt}/${attempts} failed (${err instanceof Error ? err.message : err}), retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

// The two benchmark indices - not "picked stocks", the market itself.
const PINNED_INDICES = [
  { ticker: "NIFTY50", yahoo_symbol: "^NSEI", company_name: "Nifty 50 Index", sector: "Index" },
  { ticker: "SENSEX", yahoo_symbol: "^BSESN", company_name: "BSE Sensex Index", sector: "Index" },
];

type CsvRow = { ticker: string; company_name: string; sector: string };

function parseNse500Csv(csv: string): CsvRow[] {
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",");
  const symbolIdx = header.indexOf("Symbol");
  const nameIdx = header.indexOf("Company Name");
  const industryIdx = header.indexOf("Industry");
  const seriesIdx = header.indexOf("Series");

  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    // Company names can contain commas inside quotes - handle simply since
    // NSE's own export quotes any field containing a comma.
    const cols = line.match(/(".*?"|[^",]+)(?=,|$)/g)?.map((c) => c.replace(/^"|"$/g, "").trim()) ?? [];
    if (cols.length <= Math.max(symbolIdx, nameIdx, industryIdx, seriesIdx)) continue;
    if (seriesIdx >= 0 && cols[seriesIdx] !== "EQ") continue; // equity series only

    const ticker = cols[symbolIdx];
    if (!ticker) continue;
    rows.push({
      ticker,
      company_name: cols[nameIdx] || ticker,
      sector: cols[industryIdx] || "Other",
    });
  }
  return rows;
}

// NSE's Nifty 500 membership doesn't change intraday - if this pipeline runs
// every 2-3 hours (rather than once a day), re-fetching every single run
// would hit NSE's own rate-limiting for no benefit. Skip the network call
// entirely if the universe was already synced recently.
const RESYNC_INTERVAL_HOURS = 12;

// Syncs the real, NSE-published Nifty 500 constituent list - this is the
// candidate pool market_data_pull.ts checks daily and market_movers.ts /
// watchlist_update.ts rank/select from. Nothing here is hand-picked; it's
// whatever NSE itself currently lists. If the fetch fails on a given day,
// whatever synced successfully last time stays in place (the table just
// doesn't get refreshed that run) rather than falling back to any
// hand-maintained list.
export async function syncUniverse(): Promise<{ synced: number }> {
  const supabase = getSupabaseClient();

  const { data: mostRecent } = await supabase
    .from("nse_universe")
    .select("synced_at")
    .eq("pinned", false)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mostRecent?.synced_at) {
    const hoursSinceSync = (Date.now() - new Date(mostRecent.synced_at).getTime()) / (60 * 60 * 1000);
    if (hoursSinceSync < RESYNC_INTERVAL_HOURS) {
      const { count } = await supabase.from("nse_universe").select("*", { count: "exact", head: true });
      console.log(`[universe_sync] synced ${hoursSinceSync.toFixed(1)}h ago (< ${RESYNC_INTERVAL_HOURS}h) - skipping re-fetch, ${count ?? 0} tickers already in place`);
      return { synced: count ?? 0 };
    }
  }

  for (const idx of PINNED_INDICES) {
    await supabase.from("nse_universe").upsert({ ...idx, pinned: true, synced_at: new Date().toISOString() }, { onConflict: "ticker" });
  }

  try {
    // NSE's bot-protection silently times out any request carrying a
    // self-identifying User-Agent (e.g. "MarketPulse/1.0") - confirmed by
    // direct A/B test: identical requests succeed instantly with a normal
    // browser UA and hang indefinitely with an identifying one. Use a real
    // browser UA, same as the other NSE-hitting scripts in this project.
    const csv = await fetchText(
      "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    const rows = parseNse500Csv(csv);
    if (rows.length < 100) throw new Error(`Parsed suspiciously few rows (${rows.length}) - NSE may have changed the CSV format`);

    const payload = rows.map((r) => ({
      ticker: r.ticker,
      yahoo_symbol: `${r.ticker}.NS`,
      company_name: r.company_name,
      sector: r.sector,
      pinned: false,
      synced_at: new Date().toISOString(),
    }));

    // Upsert in batches - 500 rows in one request is fine for PostgREST, but
    // stay conservative in case of payload limits.
    const BATCH = 200;
    for (let i = 0; i < payload.length; i += BATCH) {
      const { error } = await supabase.from("nse_universe").upsert(payload.slice(i, i + BATCH), { onConflict: "ticker" });
      if (error) throw error;
    }

    console.log(`[universe_sync] synced ${rows.length} tickers from NSE's official Nifty 500 list`);
    return { synced: rows.length };
  } catch (err) {
    console.warn("[universe_sync] NSE fetch failed, keeping previously synced universe:", err instanceof Error ? err.message : err);
    const { count } = await supabase.from("nse_universe").select("*", { count: "exact", head: true });
    return { synced: count ?? 0 };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncUniverse().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
