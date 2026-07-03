// One-off migration: backfill fields that were added to StoredTender after
// some tenders were already scraped (id, first_seen_at/last_seen_at,
// category, state). Safe to re-run — every field is only set if missing.
import fs from "node:fs";
import path from "node:path";
import { categorize } from "./normalizer.js";
import { tenderId } from "./dedup.js";
import type { StoredTender } from "./dedup.js";

const dataDir = path.resolve(process.cwd(), "data");
const tendersPath = path.join(dataDir, "tenders.json");
const seenPath = path.join(dataDir, "seen_refs.json");
const sourcesPath = path.resolve(process.cwd(), "config", "sources.json");

const sources: any[] = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
const sourceByName = new Map(sources.map((s) => [s.name, s]));
const seen: Record<string, { first_seen_at: string; last_seen_at: string }> = JSON.parse(
  fs.readFileSync(seenPath, "utf8")
);

const tenders: Record<string, StoredTender & { state?: string; category?: string }> = JSON.parse(
  fs.readFileSync(tendersPath, "utf8")
);

let updated = 0;
for (const key of Object.keys(tenders)) {
  const t = tenders[key];
  const source = sourceByName.get(t.source_name);

  if (!t.category || t.category === "other") {
    t.category = categorize(t.title, source?.org_type || "state_dept");
  }
  if (!t.state && source) {
    t.state = source.state;
  }
  if (!t.id) {
    t.id = tenderId(t.source_name, t.external_ref);
  }
  if (!t.first_seen_at || !t.last_seen_at) {
    const seenEntry = seen[key];
    const now = new Date().toISOString();
    t.first_seen_at = seenEntry?.first_seen_at || now;
    t.last_seen_at = seenEntry?.last_seen_at || now;
  }
  updated++;
}

fs.writeFileSync(tendersPath, JSON.stringify(tenders, null, 2));
console.log(`Backfilled ${updated} tenders (id, first/last seen, category, state).`);
