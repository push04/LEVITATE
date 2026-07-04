/**
 * POST /api/business/whatsapp/sequences/enroll
 * Enroll one or many contacts into a sequence.
 * First step queued immediately (scheduled_at = now).
 * Subsequent steps queued with scheduled_at = now + day * 86400s.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server';

const MAX_CONTACTS_PER_REQUEST = 500;

function personalize(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? vars[k.toLowerCase()] ?? `{{${k}}}`);
}

function addDays(base: Date, days: number): string {
  const d = new Date(base.getTime() + days * 86_400_000);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await requireBusinessCompany('whatsapp'));
  } catch (err) {
    return businessApiErrorResponse(err);
  }
  const company = { id: companyId };

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { sequence_id, contacts } = await req.json() as {
    sequence_id: string;
    contacts: Array<{ phone: string; name?: string; variables?: Record<string, string> }>;
  };

  if (!sequence_id || !contacts?.length)
    return NextResponse.json({ error: 'sequence_id and contacts required' }, { status: 400 });

  if (contacts.length > MAX_CONTACTS_PER_REQUEST) {
    return NextResponse.json({ error: `Max ${MAX_CONTACTS_PER_REQUEST} contacts per request` }, { status: 400 });
  }

  // Load sequence — verify ownership and active status
  const { data: seq } = await supabase
    .from('company_whatsapp_sequences')
    .select('steps, status')
    .eq('id', sequence_id)
    .eq('company_id', company.id)
    .maybeSingle();

  if (!seq) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
  if (seq.status && seq.status !== 'active') {
    return NextResponse.json({ error: `Sequence is ${seq.status} — only active sequences can be enrolled` }, { status: 400 });
  }

  interface Step { day: number; message: string }
  const steps = (seq.steps as Step[]).sort((a, b) => a.day - b.day);
  if (!steps.length) return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 });

  const now = new Date();
  let enrolled = 0;
  let queued = 0;
  const errors: string[] = [];
  const BATCH = 50;

  // Enroll rows
  const enrollRows = contacts.map(c => ({
    sequence_id,
    company_id: company.id,
    phone: c.phone.replace(/[^0-9]/g, ''),
    contact_name: c.name ?? null,
    variables: c.variables ?? {},
    current_step: 0,
    status: 'active',
    next_send_at: addDays(now, steps[0].day),
  }));

  for (let i = 0; i < enrollRows.length; i += BATCH) {
    const { error } = await supabase
      .from('company_whatsapp_sequence_contacts')
      .insert(enrollRows.slice(i, i + BATCH));
    if (error) {
      errors.push(`Enroll batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      break;
    }
    enrolled += Math.min(BATCH, enrollRows.length - i);
  }

  if (enrolled === 0 && errors.length) {
    return NextResponse.json({ error: 'Enrollment failed', details: errors }, { status: 500 });
  }

  // Pre-queue ALL steps for ALL contacts immediately (with future scheduled_at)
  const queueRows: Array<{
    to_number: string; message: string; status: string;
    company_id: string; campaign_id: string | null;
    contact_name: string | null; scheduled_at: string;
  }> = [];

  for (const c of contacts) {
    const phone = c.phone.replace(/[^0-9]/g, '');
    if (phone.length < 10) continue;
    const vars = { name: c.name ?? '', ...c.variables };
    for (const step of steps) {
      queueRows.push({
        to_number: phone,
        message: personalize(step.message, vars),
        status: 'pending',
        company_id: company.id,
        campaign_id: null,
        contact_name: c.name ?? null,
        scheduled_at: addDays(now, step.day),
      });
    }
  }

  for (let i = 0; i < queueRows.length; i += BATCH) {
    const { error } = await supabase.from('whatsapp_queue').insert(queueRows.slice(i, i + BATCH));
    if (error) {
      errors.push(`Queue batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      break;
    }
    queued += Math.min(BATCH, queueRows.length - i);
  }

  return NextResponse.json({ success: true, enrolled, queued, ...(errors.length ? { warnings: errors } : {}) });
}
