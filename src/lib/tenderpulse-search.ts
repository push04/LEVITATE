// Shared relevance ranker for TenderPulse "AI smart search", used by both the
// admin dashboard (client-side, over the full in-memory tender list) and the
// public demo (server-side, over a Supabase candidate set).
//
// The AI layer (parse-query / demo route) turns a plain-English query into
// structured filters + an expanded keyword list. This module turns those
// signals into a *graded relevance score* per tender and sorts best-first —
// instead of a binary keyword in/out filter followed by a query-independent
// sort. That is the difference between "refined the keyword search" and actual
// smart ranking. No external deps (Fuse isn't installed here); matching is
// word-boundary regex + corpus IDF.

export interface ParsedTenderFilters {
  categories?: string[] | null;
  districts?: string[] | null;
  keywords?: string[] | null;
  min_value?: number | null;
  max_value?: number | null;
}

// Minimal structural shape every rankable tender satisfies (admin Tender and
// demo TenderRow both do). Extra fields are ignored.
export interface RankableTender {
  title?: string | null;
  organization?: string | null;
  district?: string | null;
  category?: string | null;
  estimated_value_inr?: number | null;
  bid_submission_deadline?: string | null;
}

// Query-glue + procurement boilerplate: words too generic to carry intent, so
// they never qualify a match on their own. Domain words (road, hospital, solar…)
// are deliberately absent — those are the discriminating terms.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'tender', 'tenders', 'work', 'works',
  'in', 'of', 'to', 'at', 'on', 'a', 'an', 'or', 'by', 'from',
  'above', 'below', 'under', 'over', 'more', 'less', 'than', 'between', 'near', 'around',
  'lakh', 'lakhs', 'crore', 'crores', 'rs', 'inr', 'rupees', 'value', 'worth', 'cost', 'budget',
  'supply', 'installation', 'service', 'services', 'system', 'systems',
  'project', 'projects', 'scheme', 'notice', 'quotation', 'invitation',
  'corrigendum', 'providing', 'provision', 'various', 'different', 'general',
  'nit', 'eproc', 'etender', 'procurement', 'purchase',
]);

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Word-boundary matcher. Naive substring matching is wrong for short terms —
// "power" is a substring of "manpower", "plant" of "transplant" — which pulls
// in unrelated tenders. \b makes "power" match only the standalone word.
function termRegex(term: string): RegExp | null {
  const t = term.trim().toLowerCase();
  if (!t) return null;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return new RegExp(`\\b${esc}\\b`);
  } catch {
    return null;
  }
}

interface TokenSpec {
  re: RegExp;
  rare: boolean;
}

function scoreTender(
  t: RankableTender,
  parsed: ParsedTenderFilters | null,
  keywordRes: RegExp[],
  tokenSpecs: TokenSpec[]
): { score: number; matched: boolean } {
  const title = (t.title ?? '').toLowerCase();
  const org = (t.organization ?? '').toLowerCase();
  const district = (t.district ?? '').toLowerCase();
  const category = t.category ?? 'other';

  let score = 0;
  let matched = false;

  // Category boosts only, never qualifies alone (a category spans hundreds of
  // unrelated tenders). Ignored entirely on a vague 3+ category parse.
  if (parsed?.categories?.length && parsed.categories.length <= 2 && parsed.categories.includes(category)) {
    score += 5;
  }

  // District qualifies (a locational query like "Gaya" should return the
  // district) and boosts. Soft, not a hard filter.
  if (parsed?.districts?.length && parsed.districts.some((d) => d && district.includes(d.toLowerCase()))) {
    score += 5;
    matched = true;
  }

  // Expanded keywords — the core of topic ranking. A TITLE hit qualifies and
  // counts toward the multi-keyword bonus; an ORG (issuer name) hit is a weak
  // nudge that never qualifies, so a keyword like "development" matching
  // "…Development Corporation" can't pull in an agency's whole catalogue.
  {
    let hits = 0;
    for (const re of keywordRes) {
      if (re.test(title)) {
        score += 3;
        hits++;
      } else if (re.test(org)) {
        score += 1;
      }
    }
    if (hits) matched = true;
    if (hits >= 3) score += 2;
  }

  // Raw query tokens: always boost, but only *qualify* in the no-keyword
  // fallback and only on a rare (discriminating) token, so a common word can't
  // drag in noise.
  const fallbackQualify = keywordRes.length === 0;
  for (const spec of tokenSpecs) {
    if (spec.re.test(title)) {
      score += 1.5;
      if (fallbackQualify && spec.rare) matched = true;
    } else if (spec.re.test(org)) {
      score += 0.5;
    }
  }

  // Value window — a hard-ish signal, only when a value is actually stored.
  const val = t.estimated_value_inr;
  if (val != null && (parsed?.min_value != null || parsed?.max_value != null)) {
    const okMin = parsed?.min_value == null || val >= parsed.min_value;
    const okMax = parsed?.max_value == null || val <= parsed.max_value;
    if (okMin && okMax) score += 2;
    else score -= 4;
  }

  return { score, matched };
}

export interface RankOptions {
  // When true (admin, full corpus), compute IDF stats over the passed tenders
  // to flood-cap non-discriminating keywords and enable rare-token qualifying.
  // When false (demo, an already-topical fetched set) skip that — the AI
  // keywords were the fetch filter, so trust them directly.
  corpusAware?: boolean;
}

// Ranks tenders by relevance to the parsed query, best first. Returns only the
// tenders with a real signal (so it stays a search, not a reshuffle of
// everything), each with its score. Ties break toward the sooner deadline.
export function rankTenders<T extends RankableTender>(
  tenders: T[],
  parsed: ParsedTenderFilters | null,
  rawQuery: string,
  opts: RankOptions = {}
): Array<{ tender: T; score: number }> {
  const corpusAware = opts.corpusAware ?? true;
  const titles = tenders.map((t) => (t.title ?? '').toLowerCase());
  const N = titles.length;
  const df = (re: RegExp) => {
    let c = 0;
    for (const title of titles) if (re.test(title)) c++;
    return c;
  };

  // Keywords: drop junk (bare "IT" → \bit\b matches everything; single
  // stopwords) and — when corpus-aware — non-discriminating terms present in
  // >12% of titles (guards against LLM non-determinism emitting a broad word).
  const floodCutoff = Math.max(50, Math.floor(N * 0.12));
  const keywordRes: RegExp[] = [];
  for (const k of parsed?.keywords ?? []) {
    const w = (k ?? '').trim().toLowerCase();
    if (w.length < 3) continue;
    if (!w.includes(' ') && STOPWORDS.has(w)) continue;
    const re = termRegex(w);
    if (!re) continue;
    if (corpusAware && df(re) > floodCutoff) continue;
    keywordRes.push(re);
  }

  const fallbackQualify = keywordRes.length === 0;
  const rareCutoff = Math.max(2, Math.floor(N * 0.04));
  const tokenSpecs: TokenSpec[] = [];
  for (const tok of tokens(rawQuery)) {
    const re = termRegex(tok);
    if (!re) continue;
    let rare = false;
    if (corpusAware && fallbackQualify) {
      const c = df(re);
      rare = c > 0 && c <= rareCutoff;
    }
    tokenSpecs.push({ re, rare });
  }

  const scored: Array<{ tender: T; score: number }> = [];
  for (const t of tenders) {
    const { score, matched } = scoreTender(t, parsed, keywordRes, tokenSpecs);
    if (matched && score > 0) scored.push({ tender: t, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ad = a.tender.bid_submission_deadline ?? '9999-12-31';
    const bd = b.tender.bid_submission_deadline ?? '9999-12-31';
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });

  return scored;
}

// Convenience wrapper returning just the ranked tenders.
export function smartRankTenders<T extends RankableTender>(
  tenders: T[],
  parsed: ParsedTenderFilters | null,
  rawQuery: string,
  opts: RankOptions = {}
): T[] {
  return rankTenders(tenders, parsed, rawQuery, opts).map((s) => s.tender);
}
