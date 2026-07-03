// One-off backfill: push every tender already sitting in the local
// data/tenders.json store up to Supabase. Needed because the incremental
// per-crawl push only ever sends newly-dedup'd rows — anything scraped
// before Supabase was wired would otherwise never make it up. Safe to
// re-run (upsert on source_id + external_ref).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { StoredTender } from "./dedup.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — nothing to do.");
  process.exit(1);
}
const supabase = createClient(url, key);

const dataDir = path.resolve(process.cwd(), "data");
const tenders: Record<string, StoredTender & { state?: string }> = JSON.parse(
  fs.readFileSync(path.join(dataDir, "tenders.json"), "utf8")
);
const sources: any[] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "config", "sources.json"), "utf8"));
const sourceByName = new Map(sources.map((s) => [s.name, s]));

async function run() {
  const bySource = new Map<string, (StoredTender & { state?: string })[]>();
  for (const t of Object.values(tenders)) {
    if (!bySource.has(t.source_name)) bySource.set(t.source_name, []);
    bySource.get(t.source_name)!.push(t);
  }

  let totalPushed = 0;
  for (const [sourceName, list] of bySource) {
    const config = sourceByName.get(sourceName);

    const { data: existing } = await supabase.from("sources").select("id").eq("name", sourceName).maybeSingle();
    let sourceId = existing?.id;
    if (!sourceId) {
      const { data: inserted, error } = await supabase
        .from("sources")
        .insert({
          name: sourceName,
          family: config?.family || "standalone",
          base_url: config?.base_url || "unknown",
          state: config?.state || list[0]?.state || "Unknown",
          district: config?.district ?? null,
          org_type: config?.org_type || "state_dept",
          poll_frequency_minutes: config?.poll_frequency_minutes || 60,
        })
        .select("id")
        .single();
      if (error) {
        console.error(`Failed to create source ${sourceName}:`, error.message);
        continue;
      }
      sourceId = inserted.id;
    }

    const rows = list.map((t) => ({
      source_id: sourceId,
      external_ref: t.external_ref.slice(0, 500),
      title: t.title.slice(0, 2000),
      organization: t.organization?.slice(0, 500),
      district: t.district?.slice(0, 200),
      category: t.category,
      publish_date: t.publish_date || null,
      bid_submission_deadline: t.bid_submission_deadline || null,
      nit_document_url: t.nit_document_url || null,
      raw_scraped_at: t.last_seen_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from("tenders")
        .upsert(rows.slice(i, i + CHUNK), { onConflict: "source_id,external_ref" });
      if (error) {
        console.error(`Failed to push tenders for ${sourceName}:`, error.message);
      } else {
        totalPushed += rows.slice(i, i + CHUNK).length;
      }
    }
    console.log(`${sourceName}: ${rows.length} tenders pushed`);
  }

  console.log(`\nDone. Total rows upserted: ${totalPushed}`);
}

run();
