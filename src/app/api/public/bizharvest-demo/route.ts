import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { callAI, aiRouter } from '@/lib/ai/router';
import { parseNotes, bizharvestSourceLabel } from '@/lib/bizharvest-analytics';
import { maskPhone } from '@/lib/demo-mask';
import {
  DEMO_RESULT_LIMIT,
  findActiveInvite,
  getInviteTriesUsed,
  inviteAllowsTool,
  recordInviteQuery,
} from '@/lib/demo-invite';

export const dynamic = 'force-dynamic';

const SOURCES = ['gmaps', 'justdial', 'hotfrog'] as const;
const SORTS = ['rating', 'recent', 'reviews'] as const;

interface ParsedFilters {
  city: string | null;
  category: string | null;
  hasWebsite: 'yes' | 'no' | null;
  minRating: number | null;
  source: (typeof SOURCES)[number] | null;
  sortBy: (typeof SORTS)[number] | null;
}

const SYSTEM_PROMPT = `You are a query parser for a public demo of BizHarvest, a database of local Indian businesses scraped from Google Maps and JustDial. Extract search filters from the visitor's plain-English request and respond with ONLY a raw JSON object, no prose, no markdown fences, matching exactly this shape:
{
  "city": string or null,
  "category": string or null,
  "hasWebsite": one of "yes","no" or null,
  "minRating": number or null,
  "source": one of "gmaps","justdial","hotfrog" or null,
  "sortBy": one of "rating","recent","reviews" or null
}
Rules:
- "category" should be a short generic keyword suitable for a partial text match against a business category (e.g. "restaurant" not "Italian fine-dining restaurants"), or null if not mentioned.
- "city" should be just the city/area name mentioned, or null.
- Set "hasWebsite": "no" when they ask for leads WITHOUT a website / that need a website / that don't have one yet. Set "hasWebsite": "yes" only if they explicitly want leads that already have a website. Otherwise null.
- "minRating" only if a minimum star rating is mentioned.
- Never invent a city or category that wasn't mentioned.`;

function sanitizeFilters(raw: unknown): ParsedFilters {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null);
  const source = SOURCES.includes(r.source as (typeof SOURCES)[number]) ? (r.source as ParsedFilters['source']) : null;
  const sortBy = SORTS.includes(r.sortBy as (typeof SORTS)[number]) ? (r.sortBy as ParsedFilters['sortBy']) : null;
  const minRating = typeof r.minRating === 'number' && r.minRating > 0 && r.minRating <= 5 ? r.minRating : null;
  const hasWebsite = r.hasWebsite === 'yes' || r.hasWebsite === 'no' ? r.hasWebsite : null;
  return { city: str(r.city), category: str(r.category), hasWebsite, minRating, source, sortBy };
}

type LeadRow = {
  id: string;
  name: string | null;
  city: string | null;
  service_category: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  phone: string | null;
  website_link: string | null;
};

function mapLead(l: LeadRow) {
  const meta = parseNotes(l.notes);
  return {
    id: l.id,
    name: l.name ?? 'Unknown business',
    city: l.city,
    category: l.service_category,
    source: bizharvestSourceLabel(l.source),
    rating: meta.rating ?? null,
    hasWebsite: Boolean(l.website_link),
    phoneMasked: maskPhone(l.phone),
    scrapedAt: l.created_at,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code : '';
  const query = typeof body?.query === 'string' ? body.query.trim() : '';

  if (!code.trim()) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 });
  if (!query) return NextResponse.json({ error: 'Type a question first' }, { status: 400 });

  const invite = await findActiveInvite(code);
  if (!invite) return NextResponse.json({ error: 'Your invite code is invalid or has expired.' }, { status: 404 });
  if (!inviteAllowsTool(invite, 'bizharvest')) {
    return NextResponse.json({ error: 'This invite does not cover the BizHarvest demo.' }, { status: 403 });
  }

  const triesUsed = await getInviteTriesUsed(invite.id, 'bizharvest');
  if (triesUsed >= invite.max_tries) {
    return NextResponse.json({ limitReached: true, triesUsed, triesLimit: invite.max_tries });
  }

  let filters: ParsedFilters;
  try {
    const raw = await callAI(SYSTEM_PROMPT, query, 200, 'bizharvest_public_demo');
    filters = sanitizeFilters(aiRouter.extractJSON(raw));
  } catch {
    filters = { city: null, category: null, hasWebsite: null, minRating: null, source: null, sortBy: null };
  }

  const supabase = getServiceSupabase();
  const SELECT = 'id, name, city, service_category, source, notes, created_at, phone, website_link';

  let base = supabase.from('leads').select(SELECT).like('source', 'bizharvest_%');
  if (filters.city) base = base.ilike('city', `%${filters.city}%`);
  if (filters.category) base = base.ilike('service_category', `%${filters.category}%`);
  if (filters.source) base = base.eq('source', `bizharvest_${filters.source}`);
  if (filters.hasWebsite === 'yes') base = base.not('website_link', 'is', null);
  if (filters.hasWebsite === 'no') base = base.is('website_link', null);
  base = base.order('created_at', { ascending: false }).limit(DEMO_RESULT_LIMIT);

  const { data } = await base;
  let rows = (data ?? []) as LeadRow[];
  let fellBack = false;

  // Never dead-end a prospect on an empty result - fall back to a real,
  // recent sample instead of showing nothing.
  if (rows.length === 0) {
    const fallback = await supabase
      .from('leads')
      .select(SELECT)
      .like('source', 'bizharvest_%')
      .order('created_at', { ascending: false })
      .limit(DEMO_RESULT_LIMIT);
    rows = (fallback.data ?? []) as LeadRow[];
    fellBack = true;
  }

  if (filters.minRating != null) {
    const rated = rows.filter((r) => (parseNotes(r.notes).rating ?? 0) >= filters.minRating!);
    if (rated.length > 0) rows = rated;
  }
  if (filters.sortBy === 'rating') {
    rows = [...rows].sort((a, b) => (parseNotes(b.notes).rating ?? 0) - (parseNotes(a.notes).rating ?? 0));
  }

  const results = rows.map(mapLead);
  await recordInviteQuery(invite.id, 'bizharvest', query, results.length);

  return NextResponse.json({
    results,
    fellBack,
    triesUsed: triesUsed + 1,
    triesLimit: invite.max_tries,
    businessName: invite.business_name,
  });
}
