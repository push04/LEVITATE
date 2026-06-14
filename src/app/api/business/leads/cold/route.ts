/**
 * GET /api/business/leads/cold?days=30
 * Returns leads not contacted in `days` days (or never contacted).
 * Also AI-drafts a re-engagement WhatsApp message.
 *
 * POST /api/business/leads/cold
 * Launch a re-engagement WhatsApp campaign to cold leads.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { callAI } from '@/lib/ai/router';

async function getAuth() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, company: null };
  const { data: company } = await supabase.from('companies').select('id,name,industry').eq('owner_id', user.id).maybeSingle();
  return { supabase, company };
}

export async function GET(req: NextRequest) {
  const { supabase, company } = await getAuth();
  if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('company_crm_leads')
    .select('id,name,phone,whatsapp,city,service_category,status,last_contacted_at,estimated_value')
    .eq('company_id', company.id)
    .neq('status', 'closed')
    .neq('status', 'Closed')
    .or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoff}`)
    .not('phone', 'is', null)
    .order('last_contacted_at', { ascending: true, nullsFirst: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = (data ?? []).filter(l => {
    const phone = ((l.whatsapp ?? l.phone ?? '') as string).replace(/[^0-9]/g, '');
    return phone.length >= 10;
  });

  // AI-draft re-engagement message
  const coName = (company as { id: string; name?: string; industry?: string }).name ?? 'our team';
  const industry = (company as { id: string; name?: string; industry?: string }).industry ?? '';
  let draftMessage = `Hi {{name}}, this is ${coName}. We haven't connected in a while and wanted to check in. Is there anything we can help you with? Reply to this message and we'll get back to you shortly.`;

  try {
    const raw = await callAI(
      'You write short, warm WhatsApp re-engagement messages for businesses. Use {{name}} as placeholder. Keep under 80 words. No markdown. Just the message text.',
      `Write a re-engagement WhatsApp message for ${coName}${industry ? ` (${industry})` : ''}. Target: existing customers/leads not contacted in ${days}+ days. Warm, professional. Include {{name}} placeholder.`,
      150, 'reengagement-draft'
    );
    if (raw.trim().length > 20) draftMessage = raw.trim();
  } catch { /* use default */ }

  return NextResponse.json({ leads, total: leads.length, days, draftMessage });
}

export async function POST(req: NextRequest) {
  const { supabase, company } = await getAuth();
  if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { days = 30, message, campaign_name } = await req.json() as {
    days?: number;
    message: string;
    campaign_name?: string;
  };

  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from('company_crm_leads')
    .select('id,name,phone,whatsapp,city,service_category')
    .eq('company_id', company.id)
    .neq('status', 'closed')
    .neq('status', 'Closed')
    .or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoff}`)
    .not('phone', 'is', null)
    .limit(500);

  interface LeadRow { id: string; name?: string | null; phone?: string | null; whatsapp?: string | null; city?: string | null; service_category?: string | null }
  const contacts = (data ?? [] as LeadRow[]).map((l: LeadRow) => {
    const raw = ((l.whatsapp ?? l.phone ?? '') as string).replace(/[^0-9]/g, '');
    return { phone: raw.length === 10 ? `91${raw}` : raw, name: l.name ?? '', city: l.city ?? '', category: l.service_category ?? '' };
  }).filter(c => c.phone.length >= 10);

  if (!contacts.length) return NextResponse.json({ error: 'No cold leads with phone numbers' }, { status: 400 });

  const name = campaign_name ?? `Re-engagement ${new Date().toLocaleDateString('en-IN')} (${days}d cold)`;

  // Create campaign
  const { data: campaign } = await supabase
    .from('company_whatsapp_campaigns')
    .insert({
      company_id: (company as { id: string }).id,
      name,
      custom_message: message,
      target_type: 'manual',
      target_manual_numbers: contacts.map(c => c.phone),
      total_recipients: contacts.length,
      status: 'draft',
    })
    .select('id')
    .single();

  if (!campaign) return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });

  // Personalize and queue
  const BATCH = 50;
  let queued = 0;
  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH).map(c => ({
      to_number: c.phone,
      message: message.replace(/\{\{name\}\}/g, c.name || 'there').replace(/\{\{city\}\}/g, c.city).replace(/\{\{category\}\}/g, c.category),
      status: 'pending',
      company_id: (company as { id: string }).id,
      campaign_id: campaign.id,
      contact_name: c.name || null,
    }));
    const { error } = await supabase.from('whatsapp_queue').insert(batch);
    if (!error) queued += batch.length;
  }

  await supabase
    .from('company_whatsapp_campaigns')
    .update({ status: 'running', started_at: new Date().toISOString(), total_recipients: queued, updated_at: new Date().toISOString() })
    .eq('id', campaign.id);

  return NextResponse.json({ success: true, campaign_id: campaign.id, queued });
}
