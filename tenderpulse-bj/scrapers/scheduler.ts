import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeGepnic } from "./engines/gepnic.js";
import { scrapeEproc2Bihar } from "./engines/eproc2_bihar.js";
import { scrapeS3waasDistrict } from "./engines/s3waas_district.js";
import { scrapeStandaloneHealth } from "./engines/standalone_health.js";
import { scrapeGemPublic } from "./engines/gem_public.js";
import { normalize, type SourceConfig, type RawTender } from "./normalizer.js";
import { dedupAndPersist } from "./dedup.js";
import { getSupabaseClient } from "../db/supabase_client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 5);

const ENGINES: Record<string, (s: SourceConfig) => Promise<RawTender[]>> = {
  gepnic: scrapeGepnic,
  eproc2_bihar: scrapeEproc2Bihar,
  s3waas: scrapeS3waasDistrict,
  standalone: scrapeStandaloneHealth,
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

async function runOne(source: SourceConfig): Promise<SourceReport> {
  const started = Date.now();
  const engine = ENGINES[source.family];
  if (!engine) {
    return { name: source.name, family: source.family, status: "failed", found: 0, new: 0, updated: 0, error: "no engine registered for family", duration_ms: 0 };
  }
  try {
    const raw = await engine(source);
    const normalized = normalize(raw, source);
    const { newTenders, updatedTenders } = dedupAndPersist(source.name, normalized);
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

  await pushToSupabaseIfConfigured(reports);
  return reports;
}

async function pushToSupabaseIfConfigured(_reports: SourceReport[]) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log("Supabase not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY unset) — data kept in local data/ store only.");
    return;
  }
  // Left intentionally minimal: once credentials exist, wire this to upsert
  // into `sources` (by name) then `tenders` (by source_id + external_ref)
  // per db/schema.sql. Not exercised yet — no live Supabase project to test
  // against in this environment.
  console.log("Supabase configured — push-to-DB wiring pending credential verification.");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  runAllSources().then(() => process.exit(0));
}
