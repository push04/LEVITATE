import "dotenv/config";
import { pathToFileURL } from "node:url";
import https from "node:https";
import { getSupabaseClient } from "../db/supabase_client.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
// How far back to pull each run. Wider than the run interval so a missed or
// failed run doesn't create a permanent gap — dedup on nse_did (the unique
// constraint below) makes re-fetching overlap harmless.
const LOOKBACK_DAYS = 15;

function httpsGet(url: string, headers: Record<string, string>, timeoutMs = 15000): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// NSE's site sits behind Akamai bot-management — the homepage itself often
// 403s from non-residential IPs, but (empirically) the corporates-pit API
// still returns real data as long as it's called with a realistic
// User-Agent/Accept/Referer, with or without a session cookie. Best-effort
// grab a cookie if the homepage happens to succeed; proceed without one if not.
async function getSessionCookie(): Promise<string> {
  try {
    const res = await httpsGet("https://www.nseindia.com/", { "User-Agent": USER_AGENT, Accept: "text/html" }, 10000);
    const setCookie = res.headers["set-cookie"];
    if (!setCookie) return "";
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    return cookies.map((c) => c.split(";")[0]).join("; ");
  } catch {
    return "";
  }
}

function formatNseDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// NSE returns dates like "02-May-2026" or "02-May-2026 16:46" — parse to ISO.
function parseNseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const datePart = raw.split(" ")[0];
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const [dd, mon, yyyy] = datePart.split("-");
  if (!dd || !mon || !yyyy || !months[mon]) return null;
  return `${yyyy}-${months[mon]}-${dd.padStart(2, "0")}`;
}

type PitRecord = {
  symbol: string;
  company: string;
  acqName: string;
  personCategory: string | null;
  tdpTransactionType: string | null;
  securitiesTypePost: string | null;
  secAcq: string | null;
  secVal: string | null;
  afterAcqSharesPer: string | null;
  acqMode: string | null;
  intimDt: string | null;
  acqfromDt: string | null;
  did: string | number;
};

async function fetchPitFilings(attempts = 3): Promise<PitRecord[]> {
  const to = new Date();
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const url = `https://www.nseindia.com/api/corporates-pit?index=equities&from_date=${formatNseDate(from)}&to_date=${formatNseDate(to)}`;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const cookie = await getSessionCookie();
      const res = await httpsGet(url, {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        Referer: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
        ...(cookie ? { Cookie: cookie } : {}),
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const json = JSON.parse(res.body);
      return (json.data ?? []) as PitRecord[];
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        const delay = attempt * 4000;
        console.warn(`[insider_trading_pull] attempt ${attempt}/${attempts} failed (${err instanceof Error ? err.message : err}), retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

export async function pullInsiderTrading(): Promise<{ inserted: number; skipped: number }> {
  const supabase = getSupabaseClient();

  let records: PitRecord[];
  try {
    records = await fetchPitFilings();
  } catch (err) {
    console.warn("[insider_trading_pull] NSE fetch failed, skipping this run:", err instanceof Error ? err.message : err);
    return { inserted: 0, skipped: 0 };
  }

  const { data: universe } = await supabase.from("nse_universe").select("ticker");
  const validTickers = new Set((universe ?? []).map((u) => u.ticker as string));

  let inserted = 0;
  let skipped = 0;

  for (const r of records) {
    if (!r.symbol || !validTickers.has(r.symbol)) continue; // only real, known tickers — no hallucinated/unmatched symbols

    const transactionType = r.tdpTransactionType?.trim() || null;
    if (transactionType !== "Buy" && transactionType !== "Sell") continue; // skip non-directional/unclear entries

    const { error } = await supabase.from("insider_trades").insert({
      ticker: r.symbol,
      company_name: r.company ?? null,
      person_name: r.acqName ?? null,
      person_category: r.personCategory ?? null,
      transaction_type: transactionType,
      security_type: r.securitiesTypePost ?? null,
      quantity: r.secAcq ? Number(r.secAcq) : null,
      value: r.secVal ? Number(r.secVal) : null,
      shares_after_pct: r.afterAcqSharesPer ? Number(r.afterAcqSharesPer) : null,
      acquisition_mode: r.acqMode ?? null,
      intimation_date: parseNseDate(r.intimDt),
      transaction_date: parseNseDate(r.acqfromDt) ?? parseNseDate(r.intimDt),
      nse_did: String(r.did),
    });

    if (error) {
      if (error.code === "23505") skipped++; // already ingested — expected steady state
      else console.warn(`[insider_trading_pull] insert failed for ${r.symbol}:`, error.message);
    } else {
      inserted++;
    }
  }

  console.log(`[insider_trading_pull] done — ${records.length} filings seen, ${inserted} inserted, ${skipped} duplicates skipped`);
  return { inserted, skipped };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  pullInsiderTrading().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
