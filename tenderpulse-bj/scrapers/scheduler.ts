import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeGepnic } from "./engines/gepnic.js";
import { scrapeEproc2Bihar } from "./engines/eproc2_bihar.js";
import { scrapeS3waasDistrict } from "./engines/s3waas_district.js";
import { scrapeStandalonePortal } from "./engines/standalone_portal.js";
import { scrapeGemPublic } from "./engines/gem_public.js";
import { normalize, type SourceConfig, type RawTender } from "./normalizer.js";
import { dedupAndPersist, type StoredTender } from "./dedup.js";
import { getSupabaseClient } from "../db/supabase_client.js";

const supabase = getSupabaseClient();
const sourceIdCache = new Map<string, string>();

async function getOrCreateSourceId(source: SourceConfig): Promise<string | null> {
  if (!supabase) return null;
  if (sourceIdCache.has(source.name)) return sourceIdCache.get(source.name)!;

  const { data: existing, error: selectErr } = await supabase
    .from("sources")
    .select("id")
    .eq("name", source.name)
    .maybeSingle();
  if (selectErr) throw selectErr;

  if (existing) {
    sourceIdCache.set(source.name, existing.id);
    return existing.id;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("sources")
    .insert({
      name: source.name,
      family: source.family,
      base_url: source.base_url,
      state: source.state,
      district: source.district,
      org_type: source.org_type,
      poll_frequency_minutes: source.poll_frequency_minutes,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;

  sourceIdCache.set(source.name, inserted.id);
  return inserted.id;
}

async function pushTendersToSupabase(source: SourceConfig, tenders: StoredTender[]) {
  if (!supabase || tenders.length === 0) return;
  const sourceId = await getOrCreateSourceId(source);
  if (!sourceId) return;

  // A source can hand back the same external_ref twice in one scrape (e.g.
  // a repeated ticker row) — newTenders/updatedTenders being separate arrays
  // doesn't guarantee uniqueness across their concatenation. Postgres's
  // ON CONFLICT can't update the same row twice in one statement, so collapse
  // duplicates (last one wins) before building the upsert payload.
  const byRef = new Map<string, StoredTender>();
  for (const t of tenders) byRef.set(t.external_ref, t);

  const rows = Array.from(byRef.values()).map((t) => ({
    source_id: sourceId,
    external_ref: t.external_ref.slice(0, 500),
    title: t.title.slice(0, 2000),
    organization: t.organization?.slice(0, 500),
    district: t.district?.slice(0, 200),
    category: t.category,
    publish_date: t.publish_date || null,
    bid_submission_deadline: t.bid_submission_deadline || null,
    nit_document_url: t.nit_document_url || null,
    raw_scraped_at: t.last_seen_at,
    updated_at: new Date().toISOString(),
  }));

  // Supabase caps request payload size — chunk large sources (S3WaaS
  // districts rarely exceed a few dozen rows, GeM/eProc2 can run higher).
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from("tenders")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "source_id,external_ref" });
    if (error) throw error;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 5);

const ENGINES: Record<string, (s: SourceConfig) => Promise<RawTender[]>> = {
  gepnic: scrapeGepnic,
  eproc2_bihar: scrapeEproc2Bihar,
  s3waas: scrapeS3waasDistrict,
  standalone: scrapeStandalonePortal,
  gem: scrapeGemPublic,
  // ireps intentionally omitted — public search is JS-gated with no stable
  // href/API surface found yet; lowest priority per build order (Section 12).
};

interface SourceReport {
  name: string;
  family: string;
  status: "success" | "failed";
  found: number;
  new: number;
  updated: number;
  error?: string;
  duration_ms: number;
}

// Longest source in a normal run so far is ~90s (see data/crawl_report.json);
// 3 minutes gives real headroom while still guaranteeing a hung engine (e.g.
// a Playwright action stuck on a selector that never appears) can't hold a
// concurrency slot — and therefore the whole crawl cycle — hostage forever.
const SOURCE_TIMEOUT_MS = Number(process.env.CRAWL_SOURCE_TIMEOUT_MS || 180_000);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms: ${label}`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function runOne(source: SourceConfig): Promise<SourceReport> {
  const started = Date.now();
  const engine = ENGINES[source.family];
  if (!engine) {
    return { name: source.name, family: source.family, status: "failed", found: 0, new: 0, updated: 0, error: "no engine registered for family", duration_ms: 0 };
  }
  try {
    const raw = await withTimeout(engine(source), SOURCE_TIMEOUT_MS, source.name);
    const normalized = normalize(raw, source);
    const { newTenders, updatedTenders } = dedupAndPersist(source.name, normalized);

    if (supabase) {
      try {
        await pushTendersToSupabase(source, [...newTenders, ...updatedTenders]);
      } catch (dbErr) {
        console.error(`[supabase] push failed for ${source.name}:`, (dbErr as Error).message);
      }
    }

    return {
      name: source.name,
      family: source.family,
      status: "success",
      found: normalized.length,
      new: newTenders.length,
      updated: updatedTenders.length,
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    return {
      name: source.name,
      family: source.family,
      status: "failed",
      found: 0,
      new: 0,
      updated: 0,
      error: (err as Error).message,
      duration_ms: Date.now() - started,
    };
  }
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<SourceReport>) {
  const results: SourceReport[] = [];
  let idx = 0;
  async function next(): Promise<void> {
    const i = idx++;
    if (i >= items.length) return;
    results[i] = await worker(items[i]);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

export async function runAllSources(): Promise<SourceReport[]> {
  const configPath = path.resolve(__dirname, "..", "config", "sources.json");
  const sources: SourceConfig[] = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const active = sources.filter((s: any) => s.is_active !== false);

  console.log(`[${new Date().toISOString()}] Starting crawl of ${active.length} sources (concurrency=${CONCURRENCY})`);
  const reports = await runPool(active, CONCURRENCY, runOne);

  const dataDir = path.resolve(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "crawl_report.json"), JSON.stringify(reports, null, 2));

  const totalNew = reports.reduce((a, r) => a + r.new, 0);
  const totalUpdated = reports.reduce((a, r) => a + r.updated, 0);
  const failed = reports.filter((r) => r.status === "failed");
  console.log(
    `[${new Date().toISOString()}] Crawl finished: ${totalNew} new, ${totalUpdated} updated, ${failed.length} sources failed`
  );
  if (failed.length) {
    console.log("Failed sources:", failed.map((f) => `${f.name} (${f.error})`).join("; "));
  }
  console.log(
    supabase
      ? "Supabase configured — new/updated tenders were pushed per-source above."
      : "Supabase not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY unset) — data kept in local data/ store only."
  );

  return reports;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  runAllSources().then(() => process.exit(0));
}
