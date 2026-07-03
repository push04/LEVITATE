export interface SourceConfig {
  name: string;
  family: "gepnic" | "eproc2_bihar" | "s3waas" | "gem" | "standalone" | "ireps";
  base_url: string;
  state: string;
  district: string | null;
  org_type: "state_dept" | "psu" | "hospital" | "district" | "municipal" | "railway" | "mining";
  poll_frequency_minutes: number;
  variant?: string; // disambiguates engines that need per-source scraping logic (e.g. "standalone")
}

export type TenderCategory =
  | "civil_works"
  | "supply"
  | "services"
  | "it"
  | "mining"
  | "health"
  | "education"
  | "other";

export interface RawTender {
  external_ref: string;
  title: string;
  organization?: string;
  district?: string;
  state?: string;
  category?: TenderCategory;
  publish_date?: string | null;
  bid_submission_deadline?: string | null;
  nit_document_url?: string | null;
}

// Every engine returns RawTender[]; downstream dedup/AI/DB code only ever
// depends on this shape, so a new source is just a new engine + config row.
export function normalize(raw: RawTender[], source: SourceConfig): RawTender[] {
  return raw
    .filter((t) => t.title && t.external_ref)
    .map((t) => ({
      ...t,
      district: t.district ?? source.district ?? undefined,
      state: source.state,
      organization: t.organization ?? source.name,
      category: t.category ?? categorize(t.title, source.org_type),
    }));
}

// Keyword heuristic so category filtering/analytics work immediately without
// burning Groq quota on every scraped row — Section 7 of tenderbot.md reserves
// AI calls for genuinely new/changed tenders, and even then this cheap first
// pass lets the admin re-sort before an AI summary ever runs.
const CATEGORY_RULES: [TenderCategory, RegExp][] = [
  ["health", /hospital|medical|drug|medicine|health|ambulance|physiotherapy|surgical|diagnos/i],
  ["mining", /mining|mine\b|coal|sand ghat|e-auction.*sand|mineral/i],
  ["it", /software|network|server|computer|it\s|website|application dev|digital|e-governance/i],
  ["education", /school|college|university|education|vidyalaya|library|classroom/i],
  [
    "civil_works",
    /construction|road|building|drain|bridge|culvert|pcc|rcc|infrastructure|widening|strengthening|boundary wall/i,
  ],
  ["supply", /supply|procurement of|purchase of|rate contract|equipment|furniture|material/i],
  ["services", /service|agency|manpower|outsourc|security|housekeeping|consultancy|audit/i],
];

export function categorize(title: string, orgType: SourceConfig["org_type"]): TenderCategory {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(title)) return category;
  }
  if (orgType === "hospital") return "health";
  if (orgType === "mining") return "mining";
  return "other";
}
