/**
 * POST /api/business/leads/score
 * AI-scores all company CRM leads (0-100) in batches of 10.
 * Writes ai_score, ai_score_reason, ai_scored_at back to company_crm_leads.
 *
 * Designed to be called client-side in a loop (one batch per request)
 * to stay within Netlify's 10s serverless timeout.
 *
 * Body: { offset?: number }  — pass the offset returned from prev call
 * Response: { scored: number, nextOffset: number | null, done: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { callAI } from '@/lib/ai/router';

const BATCH = 10;

interface LeadRow {
  id: string;
  name: string;
  city?: string | null;
  service_category?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  priority?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  last_contacted_at?: string | null;
  created_at: string;
}

function formatLead(l: LeadRow, i: number): string {
  const daysSinceContact = l.last_contacted_at
    ? Math.floor((Date.now() - new Date(l.last_contacted_at).getTime()) / 86_400_000)
    : null;
  return [
    `#${i + 1} id=${l.id}`,
    `name="${l.name}"`,
    l.city ? `city=${l.city}` : '',
    l.service_category ? `category=${l.service_category}` : '',
    l.status ? `status=${l.status}` : '',
    l.estimated_value ? `value=₹${l.estimated_value}` : '',
    l.priority ? `priority=${l.priority}` : '',
    l.phone ? 'has_phone=yes' : 'has_phone=no',
    l.email ? 'has_email=yes' : 'has_email=no',
    daysSinceContact !== null ? `days_since_contact=${daysSinceContact}` : 'never_contacted',
    l.notes ? `notes="${l.notes?.slice(0, 80)}"` : '',
  ].filter(Boolean).join(' | ');
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle();
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 });

  const { offset = 0 } = await req.json() as { offset?: number };

  const { data: leads, error } = await supabase
    .from('company_crm_leads')
    .select('id,name,city,service_category,status,estimated_value,priority,email,phone,notes,last_contacted_at,created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + BATCH - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads?.length) return NextResponse.json({ scored: 0, nextOffset: null, done: true });

  const leadsText = (leads as LeadRow[]).map((l, i) => formatLead(l, i)).join('\n');

  const system = 'You are a CRM lead scoring AI. Score each lead 0-100 based on: data completeness, has phone/email, recency of contact, deal value, status progression, and business potential. Return ONLY valid JSON array, no markdown.';

  const prompt = `Score these ${leads.length} leads. Return JSON array (one object per lead, same order):
[{"id":"uuid","score":75,"reason":"Short reason max 10 words"}, ...]

Leads:
${leadsText}`;

  let scored = 0;
  try {
    const raw = await callAI(system, prompt, 600, 'lead-scorer');
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response');

    const results = JSON.parse(match[0]) as Array<{ id: string; score: number; reason: string }>;
    const now = new Date().toISOString();

    for (const r of results) {
      if (!r.id || typeof r.score !== 'number') continue;
      await supabase
        .from('company_crm_leads')
        .update({ ai_score: Math.min(100, Math.max(0, Math.round(r.score))), ai_score_reason: r.reason ?? '', ai_scored_at: now })
        .eq('id', r.id)
        .eq('company_id', company.id);
      scored++;
    }
  } catch (err) {
    console.error('[Score] AI failed:', err);
    if (scored === 0) {
      return NextResponse.json(
        { error: 'AI scoring failed, please try again', scored: 0 },
        { status: 500 }
      );
    }
  }

  const nextOffset = leads.length === BATCH ? offset + BATCH : null;
  return NextResponse.json({ scored, nextOffset, done: nextOffset === null });
}
