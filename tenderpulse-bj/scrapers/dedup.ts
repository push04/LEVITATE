import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { RawTender } from "./normalizer.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const SEEN_PATH = path.join(DATA_DIR, "seen_refs.json");
const TENDERS_PATH = path.join(DATA_DIR, "tenders.json");

interface SeenEntry {
  first_seen_at: string;
  last_seen_at: string;
}

export interface StoredTender extends RawTender {
  id: string;
  source_name: string;
  first_seen_at: string;
  last_seen_at: string;
}

function loadJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

// Atomic write (write to temp file, then rename) so the admin server — which
// reads this same file concurrently — never sees a half-written JSON blob.
function writeJsonAtomic(file: string, data: unknown) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// Stable, deterministic id derived from source+external_ref — same tender
// always gets the same id across crawls, which is what lets the admin
// server's override layer (category corrections, notes, hide/restore) key
// off it safely.
export function tenderId(sourceName: string, externalRef: string): string {
  return crypto.createHash("sha1").update(`${sourceName}::${externalRef}`).digest("hex").slice(0, 16);
}

export interface DedupResult {
  newTenders: StoredTender[];
  updatedTenders: StoredTender[];
}

// Local, credential-free dedup store (data/seen_refs.json + data/tenders.json).
// Once SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are set this same shape maps
// directly onto the `tenders` table's (source_id, external_ref) unique key.
export function dedupAndPersist(
  sourceName: string,
  tenders: RawTender[]
): DedupResult {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const seen = loadJson<Record<string, SeenEntry>>(SEEN_PATH, {});
  const allTenders = loadJson<Record<string, StoredTender>>(TENDERS_PATH, {});

  const now = new Date().toISOString();
  const newTenders: StoredTender[] = [];
  const updatedTenders: StoredTender[] = [];

  for (const t of tenders) {
    const key = `${sourceName}::${t.external_ref}`;
    const id = tenderId(sourceName, t.external_ref);
    if (!seen[key]) {
      seen[key] = { first_seen_at: now, last_seen_at: now };
      const record: StoredTender = { ...t, id, source_name: sourceName, first_seen_at: now, last_seen_at: now };
      newTenders.push(record);
      allTenders[key] = record;
    } else {
      const prior = allTenders[key];
      const record: StoredTender = {
        ...t,
        id,
        source_name: sourceName,
        first_seen_at: seen[key].first_seen_at,
        last_seen_at: now,
      };
      if (prior && prior.bid_submission_deadline !== t.bid_submission_deadline) {
        updatedTenders.push(record); // deadline shift == likely corrigendum
      }
      seen[key].last_seen_at = now;
      allTenders[key] = record;
    }
  }

  writeJsonAtomic(SEEN_PATH, seen);
  writeJsonAtomic(TENDERS_PATH, allTenders);

  return { newTenders, updatedTenders };
}
