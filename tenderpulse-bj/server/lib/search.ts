// AI smart ranking: type a freeform query ("construction tenders in Gaya above
// 5 lakh") and get back tenders sorted by *relevance*, best match first —
// not a hard keyword in/out filter.
//
// Pipeline:
//   1. If GROQ_API_KEY is set, an LLM parses the query into structured signals
//      (category / district / keywords / value range) and expands the topic
//      into the concrete words a real Indian tender title would use.
//   2. Every tender is *scored* against those signals AND a Fuse.js fuzzy pass,
//      then sorted by score. Nothing is a binary gate except explicit value
//      bounds — a tender that matches the category but not a literal keyword
//      still surfaces, just ranked lower. This is the difference between
//      "smart ranking" and the old substring filter.
//   3. Without a Groq key it degrades to raw-token + fuzzy scoring, which still
//      ranks sensibly — just without natural-language parsing.
import Fuse from "fuse.js";
import type { Tender } from "./store.js";

export interface ParsedFilters {
  categories?: string[];
  districts?: string[];
  keywords?: string[];
  min_value?: number;
  max_value?: number;
}

// llama-3.1-8b-instant is the only model we use: high free-tier daily cap
// (~14,400 requests/day) so searches don't exhaust quota. llama-3.3-70b-versatile
// is capped at 1,000/day and gemma2-9b-it has been decommissioned by Groq, so
// neither is a usable fallback. On a 429 (per-minute limit) we simply fall back
// to fuzzy search for that request rather than failing.
const GROQ_MODELS = ["llama-3.1-8b-instant"];

const SYSTEM_PROMPT =
  "Extract structured search filters from a tender-search query. Respond with strict JSON only: " +
  '{"categories": string[] (from civil_works, supply, services, it, mining, health, education, other), ' +
  '"districts": string[], "keywords": string[], "min_value": number|null, "max_value": number|null}. ' +
  "\"keywords\" are matched against tender titles, so a bare topic word misses " +
  "relevant tenders that use different wording. Expand the query's subject into the specific things a real " +
  'Indian government tender title would actually say — e.g. "medical equipment" should expand to concrete ' +
  'items like "x-ray", "ultrasound", "ventilator", "autoclave", "ot table", "ecg", "surgical instrument", ' +
  '"diagnostic machine"; "road construction" should expand to "road", "rcc", "pcc", "culvert", "bridge", ' +
  '"widening", "strengthening". ALWAYS also include the core subject word(s) from the query on their own ' +
  '(e.g. "solar", "cctv", "software", "ambulance") as keywords — not only multi-word phrases — so a title ' +
  "using just the bare word still matches. Include the original phrase plus 6-12 concrete expansions — stay " +
  "on-topic, don't drift into unrelated categories. Omit fields you can't infer by leaving arrays empty and numbers null.";

export async function parseQueryWithGroq(query: string): Promise<ParsedFilters | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  for (const model of GROQ_MODELS) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      });
      if (resp.status === 429) continue; // this model's per-minute quota is hit — try the next one
      if (!resp.ok) return null;
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      return JSON.parse(content);
    } catch {
      return null; // network/quota issue — caller falls back to fuzzy scoring
    }
  }
  return null; // every model rate-limited — caller falls back to fuzzy scoring
}

function hasUsableFilters(f: ParsedFilters): boolean {
  return !!(
    f.categories?.length ||
    f.districts?.length ||
    f.keywords?.length ||
    f.min_value != null ||
    f.max_value != null
  );
}

// Words too generic to carry search intent — dropped from raw-token matching so
// a bare "installation"/"supply"/"services" token doesn't qualify every tender
// that happens to use that boilerplate. Domain words (road, hospital, solar,
// school, water…) are deliberately NOT here — those are the discriminating
// terms. LLM-expanded keywords are matched separately and keep full weight.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "tender", "tenders", "work", "works",
  "in", "of", "to", "at", "on", "a", "an", "or", "by", "from",
  "above", "below", "under", "over", "more", "less", "than", "between", "near", "around",
  "lakh", "lakhs", "crore", "crores", "rs", "inr", "rupees", "value", "worth", "cost", "budget",
  // generic tender/procurement boilerplate — present across the whole corpus
  "supply", "installation", "service", "services", "system", "systems",
  "project", "projects", "scheme", "notice", "quotation", "invitation",
  "corrigendum", "providing", "provision", "various", "different", "general",
  "nit", "eproc", "etender", "procurement", "purchase",
]);

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Word-boundary matcher, compiled once per term. Naive substring matching is
// wrong for short terms — "power" is a substring of "manpower", "plant" of
// "transplant" — which silently pulls unrelated tenders into (and up) the
// results. \b boundaries make "power" match only the standalone word. Phrases
// ("solar power plant") match as a bounded phrase.
function termRegex(term: string): RegExp | null {
  const t = term.trim().toLowerCase();
  if (!t) return null;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return new RegExp(`\\b${esc}\\b`);
  } catch {
    return null;
  }
}

// A query token plus whether it's rare enough across the corpus to be a
// discriminating term. Common tokens ("power", "development", "services") only
// nudge the score; rare ones ("solar", "cctv", "ambulance") can qualify a
// tender on their own — the difference is IDF, computed once per search.
interface TokenSpec {
  re: RegExp;
  rare: boolean;
}

// Scores one tender against the parsed signals + a precomputed fuzzy similarity.
// `matched` gates inclusion (a tender with no real signal is dropped, so this
// stays a search rather than "reorder everything"); `score` orders the winners.
// `keywordRes`/`tokenSpecs` are precompiled once per search.
function scoreTender(
  t: Tender,
  parsed: ParsedFilters | null,
  keywordRes: RegExp[],
  tokenSpecs: TokenSpec[],
  fuzzy: number
): { score: number; matched: boolean } {
  const title = (t.title ?? "").toLowerCase();
  const org = (t.organization ?? "").toLowerCase();
  const district = (t.district ?? "").toLowerCase();
  const category = t.category ?? "other";

  let score = 0;
  let matched = false;

  // Category only *boosts* — it never qualifies a tender on its own. A category
  // spans hundreds of unrelated tenders (everything in "supply", say), so
  // matching on it alone floods results with the whole bucket. We also ignore
  // the signal entirely when the LLM returned 3+ categories: that's a vague
  // parse ("solar" → civil_works/supply/services/it) where category is noise,
  // not intent. Real topical matching happens via keywords/tokens below.
  if (parsed?.categories?.length && parsed.categories.length <= 2 && parsed.categories.includes(category)) {
    score += 5;
  }

  // District: heavy boost, and (unlike category) it *does* qualify — a
  // district-only query like "Gaya" should return that district's tenders.
  // Soft rather than a hard filter so an over-eager LLM guess can't wipe out
  // every result.
  if (parsed?.districts?.length && parsed.districts.some((d) => district.includes(d.toLowerCase()))) {
    score += 5;
    matched = true;
  }

  // Expanded keywords — the core of topic ranking. A hit in the TITLE qualifies
  // the tender and counts toward the multi-keyword bonus: the title states what
  // the tender is *for*. A hit only in the ORGANIZATION name is a weak boost
  // that never qualifies — otherwise a keyword like "development" matching an
  // issuer's name ("…Development Corporation") would pull in that agency's
  // entire catalogue regardless of subject.
  {
    let hits = 0;
    for (const re of keywordRes) {
      if (re.test(title)) {
        score += 3;
        hits++;
      } else if (re.test(org)) {
        score += 1; // issuer-name match: nudge only, no qualify
      }
    }
    if (hits) matched = true;
    if (hits >= 3) score += 2;
  }

  // Raw query tokens against title/org. Every hit *boosts*. They only *qualify*
  // a tender in the no-LLM fallback (no Groq key / unusable parse) — and even
  // then only a hit on a *rare*, discriminating token counts, so a common word
  // ("power" as the standalone word in "Man Power") nudges score without
  // dragging in noise. When the LLM gave us keywords we trust those for
  // inclusion instead; raw tokens just refine the ranking.
  const fallbackQualify = keywordRes.length === 0;
  for (const spec of tokenSpecs) {
    if (spec.re.test(title)) {
      score += 1.5;
      if (fallbackQualify && spec.rare) matched = true;
    } else if (spec.re.test(org)) {
      score += 0.5;
    }
  }

  // Value window is a hard-ish signal — only applied when a value is actually
  // stored on the tender (most rows have none, so this is usually a no-op).
  const val = (t as any).estimated_value_inr;
  if (val != null && (parsed?.min_value != null || parsed?.max_value != null)) {
    const okMin = parsed?.min_value == null || val >= parsed.min_value;
    const okMax = parsed?.max_value == null || val <= parsed.max_value;
    if (okMin && okMax) score += 2;
    else score -= 4; // explicitly out of the stated budget — push it down hard
  }

  // Fuzzy similarity (0..1, higher = closer) — a tiebreaker/typo-catcher, not a
  // primary matcher. It only *qualifies* a tender on its own when the match is
  // near-exact (>= 0.8); a looser fuzzy hit (e.g. "power" bleeding into
  // "manpower") must not drag unrelated tenders into the results.
  if (fuzzy > 0) {
    score += fuzzy * 3;
    if (fuzzy >= 0.8) matched = true;
  }

  return { score, matched };
}

export async function smartSearch(tenders: Tender[], query: string): Promise<Tender[]> {
  if (!query.trim()) return tenders;

  const parsedRaw = await parseQueryWithGroq(query);
  const parsed = parsedRaw && hasUsableFilters(parsedRaw) ? parsedRaw : null;

  const titles = tenders.map((t) => (t.title ?? "").toLowerCase());
  const N = titles.length;
  const df = (re: RegExp) => {
    let c = 0;
    for (const title of titles) if (re.test(title)) c++;
    return c;
  };

  // Build keyword regexes, guarding against two failure modes the LLM exhibits:
  //   1. junk terms — a bare "IT" → \bit\b, or single stopwords ("supply") —
  //      dropped by length/stopword check;
  //   2. non-discriminating terms — the LLM is non-deterministic and sometimes
  //      emits a broad word matching hundreds of titles, which floods results.
  //      We drop any keyword present in >12% of titles. A keyword this common
  //      can't be the point of the search; the specific ones carry the intent.
  const floodCutoff = Math.max(50, Math.floor(N * 0.12));
  const keywordRes: RegExp[] = [];
  for (const k of parsed?.keywords ?? []) {
    const w = k.trim().toLowerCase();
    if (w.length < 3) continue;
    if (!w.includes(" ") && STOPWORDS.has(w)) continue;
    const re = termRegex(w);
    if (!re) continue;
    if (df(re) > floodCutoff) continue; // too common to be discriminating
    keywordRes.push(re);
  }

  // Raw query tokens always contribute to ranking. Their rarity only *qualifies*
  // a match in the no-LLM fallback (no keywords to trust); a rare token like
  // "solar" pulls its tenders in, a common one only nudges score.
  const fallbackQualify = keywordRes.length === 0;
  const rareCutoff = Math.max(2, Math.floor(N * 0.04));
  const tokenSpecs: TokenSpec[] = [];
  for (const tok of tokens(query)) {
    const re = termRegex(tok);
    if (!re) continue;
    let rare = false;
    if (fallbackQualify) {
      const c = df(re);
      rare = c > 0 && c <= rareCutoff;
    }
    tokenSpecs.push({ re, rare });
  }

  // One fuzzy pass over the whole set, keyed by id, so every tender carries a
  // similarity signal into scoring (not just the ones Fuse would have returned).
  const fuse = new Fuse(tenders, {
    keys: [
      { name: "title", weight: 2 },
      { name: "organization", weight: 1 },
      { name: "district", weight: 1 },
      { name: "category", weight: 1.5 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });
  const fuzzyById = new Map<string, number>();
  for (const r of fuse.search(query)) {
    // Fuse score: 0 = perfect, 1 = worst → convert to a 0..1 similarity.
    fuzzyById.set((r.item as Tender).id, 1 - (r.score ?? 1));
  }

  const scored: Array<{ t: Tender; score: number }> = [];
  for (const t of tenders) {
    const { score, matched } = scoreTender(t, parsed, keywordRes, tokenSpecs, fuzzyById.get(t.id) ?? 0);
    if (matched && score > 0) scored.push({ t, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: sooner deadline first — equally-relevant, the more urgent one
    // is the more useful one to act on.
    const ad = a.t.bid_submission_deadline ?? "9999-12-31";
    const bd = b.t.bid_submission_deadline ?? "9999-12-31";
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });

  return scored.map((s) => s.t);
}
