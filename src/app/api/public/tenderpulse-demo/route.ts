import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { callAI, aiRouter } from '@/lib/ai/router';
import { rankTenders } from '@/lib/tenderpulse-search';
import {
  DEMO_RESULT_LIMIT,
  findActiveInvite,
  getInviteTriesUsed,
  inviteAllowsTool,
  recordInviteQuery,
} from '@/lib/demo-invite';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['civil_works', 'supply', 'services', 'it', 'mining', 'health', 'education', 'other'] as const;
const SORTS = ['deadline', 'value'] as const;

interface ParsedFilters {
  district: string | null;
  category: (typeof CATEGORIES)[number] | null;
  keywords: string[];
  minValueInr: number | null;
  sortBy: (typeof SORTS)[number] | null;
}

const SYSTEM_PROMPT = `You are a query parser for a public demo of TenderPulse, a tracker of Bihar and Jharkhand government tenders. Extract search filters from the visitor's plain-English request and respond with ONLY a raw JSON object, no prose, no markdown fences, matching exactly this shape:
{
  "district": string or null,
  "category": one of "civil_works","supply","services","it","mining","health","education","other" or null,
  "keywords": string[],
  "minValueInr": number or null,
  "sortBy": one of "deadline","value" or null
}
Rules:
- "district" should be just the district/city name mentioned, or null.
- "category" must be exactly one of the listed values, inferred from the request (e.g. "construction" or "roadwork" -> "civil_works", "computers" or "software" -> "it"), or null if unclear.
- "keywords": expand the topic into the specific words a real Indian government tender TITLE would use, because titles rarely repeat the generic phrase. Always include the core subject word(s) on their own (e.g. "solar", "cctv", "ambulance") plus 4-10 concrete expansions — e.g. "medical equipment" -> ["x-ray","ventilator","ultrasound","ecg","autoclave","surgical instrument"]; "road construction" -> ["road","rcc","pcc","culvert","bridge","widening"]. Empty array if the request has no topic (just a place or "show me tenders").
- "minValueInr" only if a minimum tender value is mentioned, converted to plain rupees (e.g. "above 10 lakh" -> 1000000, "above 1 crore" -> 10000000).
- Never invent a district that wasn't mentioned.`;

function sanitizeFilters(raw: unknown): ParsedFilters {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null);
  const category = CATEGORIES.includes(r.category as (typeof CATEGORIES)[number]) ? (r.category as ParsedFilters['category']) : null;
  const sortBy = SORTS.includes(r.sortBy as (typeof SORTS)[number]) ? (r.sortBy as ParsedFilters['sortBy']) : null;
  const minValueInr = typeof r.minValueInr === 'number' && r.minValueInr > 0 ? r.minValueInr : null;
  const keywords = Array.isArray(r.keywords)
    ? (r.keywords as unknown[])
        .filter((k): k is string => typeof k === 'string')
        .map((k) => k.trim())
        .filter((k) => k.length >= 3)
        .slice(0, 12)
    : [];
  return { district: str(r.district), category, keywords, minValueInr, sortBy };
}

type SourceRef = { name: string; state: string } | { name: string; state: string }[] | null;
function firstSource(s: SourceRef) {
  if (!s) return null;
  return Array.isArray(s) ? (s[0] ?? null) : s;
}

type TenderRow = {
  id: string;
  title: string;
  organization: string | null;
  district: string | null;
  category: string | null;
  estimated_value_inr: number | null;
  bid_submission_deadline: string | null;
  sources: SourceRef;
};

function mapTender(t: TenderRow) {
  const src = firstSource(t.sources);
  return {
    id: t.id,
    title: t.title,
    organization: t.organization,
    district: t.district,
    category: t.category,
    estimatedValueInr: t.estimated_value_inr,
    deadline: t.bid_submission_deadline,
    sourceName: src?.name ?? null,
    sourceState: src?.state ?? null,
  };
}

const SELECT =
  'id, title, organization, district, category, estimated_value_inr, bid_submission_deadline, sources(name, state)';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code : '';
  const query = typeof body?.query === 'string' ? body.query.trim() : '';

  if (!code.trim()) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 });
  if (!query) return NextResponse.json({ error: 'Type a question first' }, { status: 400 });

  const invite = await findActiveInvite(code);
  if (!invite) return NextResponse.json({ error: 'Your invite code is invalid or has expired.' }, { status: 404 });
  if (!inviteAllowsTool(invite, 'tenderpulse')) {
    return NextResponse.json({ error: 'This invite does not cover the TenderPulse demo.' }, { status: 403 });
  }

  const triesUsed = await getInviteTriesUsed(invite.id, 'tenderpulse');
  if (triesUsed >= invite.max_tries) {
    return NextResponse.json({ limitReached: true, triesUsed, triesLimit: invite.max_tries });
  }

  let filters: ParsedFilters;
  try {
    const raw = await callAI(SYSTEM_PROMPT, query, 200, 'tenderpulse_public_demo');
    filters = sanitizeFilters(aiRouter.extractJSON(raw));
  } catch {
    filters = { district: null, category: null, keywords: [], minValueInr: null, sortBy: null };
  }

  const supabase = getServiceSupabase();
  // `status = 'active'` alone can lag reality if the scraper hasn't yet
  // flipped a tender to closed - filter on the actual deadline too so a
  // demo visitor never sees something that's already expired. Tenders with
  // no deadline on file are kept (we genuinely don't know either way), never
  // labeled live or expired on the frontend for that reason.
  const nowIso = new Date().toISOString();
  const notExpiredFilter = `bid_submission_deadline.is.null,bid_submission_deadline.gte.${nowIso}`;

  // Rank by topical relevance when the AI extracted keywords and the visitor
  // didn't explicitly ask for a value/deadline ordering. Otherwise keep the
  // simple DB-ordered list.
  const useRelevance = filters.keywords.length > 0 && !filters.sortBy;
  const FETCH_LIMIT = Math.max(60, DEMO_RESULT_LIMIT * 4);

  let base = supabase.from('tenders').select(SELECT).eq('status', 'active').eq('is_hidden', false).or(notExpiredFilter);
  if (filters.district) base = base.ilike('district', `%${filters.district}%`);
  if (filters.minValueInr) base = base.gte('estimated_value_inr', filters.minValueInr);

  // Topic: fetch every tender whose TITLE contains any expanded keyword, then
  // rank in JS. This is what makes "solar plant tenders" return actual solar
  // tenders instead of every tender in a coarse category. Sanitize keywords so
  // they can't break PostgREST's or() grammar (no commas/parentheses).
  const kwOrs = filters.keywords
    .map((k) => k.replace(/[^a-z0-9 -]/gi, '').trim())
    .filter((k) => k.length >= 3)
    .slice(0, 12)
    .map((k) => `title.ilike.%${k}%`);
  if (kwOrs.length) {
    base = base.or(kwOrs.join(','));
  } else if (filters.category) {
    base = base.eq('category', filters.category);
  }

  base =
    filters.sortBy === 'value'
      ? base.order('estimated_value_inr', { ascending: false, nullsFirst: false })
      : base.order('bid_submission_deadline', { ascending: true, nullsFirst: false });
  base = base.limit(useRelevance ? FETCH_LIMIT : DEMO_RESULT_LIMIT);

  const { data } = await base;
  let rows = (data ?? []) as unknown as TenderRow[];
  let fellBack = false;

  // Relevance ranking over the topical candidate set (best keyword match first).
  if (useRelevance && rows.length) {
    const ranked = rankTenders(
      rows,
      {
        categories: filters.category ? [filters.category] : null,
        districts: filters.district ? [filters.district] : null,
        keywords: filters.keywords,
        min_value: filters.minValueInr,
      },
      query,
      { corpusAware: false }
    );
    rows = ranked.map((r) => r.tender).slice(0, DEMO_RESULT_LIMIT);
  }

  // Never dead-end a prospect on an empty result - fall back to a real,
  // currently-open sample instead of showing nothing.
  if (rows.length === 0) {
    const fallback = await supabase
      .from('tenders')
      .select(SELECT)
      .eq('status', 'active')
      .eq('is_hidden', false)
      .or(notExpiredFilter)
      .order('bid_submission_deadline', { ascending: true, nullsFirst: false })
      .limit(DEMO_RESULT_LIMIT);
    rows = (fallback.data ?? []) as unknown as TenderRow[];
    fellBack = true;
  }

  const results = rows.map(mapTender);
  await recordInviteQuery(invite.id, 'tenderpulse', query, results.length);

  return NextResponse.json({
    results,
    fellBack,
    triesUsed: triesUsed + 1,
    triesLimit: invite.max_tries,
    businessName: invite.business_name,
  });
}
