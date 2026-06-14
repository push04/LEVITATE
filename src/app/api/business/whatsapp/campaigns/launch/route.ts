import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Replace {{var}} placeholders in a message for a specific recipient
function personalize(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? vars[key.toLowerCase()] ?? `{{${key}}}`);
}

// Normalize phone to digits only; prepend 91 if 10-digit Indian number
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
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

  const body = await req.json() as {
    campaign_id: string;
    // Optional: per-contact data for personalized messages
    // Each entry: { phone, name?, variables?: { name, city, company, ... } }
    contact_data?: Array<{ phone: string; name?: string; variables?: Record<string, string> }>;
  };

  const { campaign_id, contact_data } = body;
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

  const { data: campaign } = await supabase
    .from('company_whatsapp_campaigns')
    .select('*')
    .eq('id', campaign_id)
    .eq('company_id', company.id)
    .maybeSingle();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.status === 'running' || campaign.status === 'completed') {
    return NextResponse.json({ error: 'Campaign already launched' }, { status: 400 });
  }

  const template: string = campaign.custom_message ?? '';
  if (!template.trim()) return NextResponse.json({ error: 'Campaign has no message' }, { status: 400 });

  // ── Collect recipients ────────────────────────────────────────────────
  type Recipient = { phone: string; name: string; variables: Record<string, string> };
  let recipients: Recipient[] = [];

  if (contact_data?.length) {
    // Caller provided full per-contact data (from import/analyze flows)
    for (const c of contact_data) {
      const phone = normalizePhone(c.phone);
      if (phone.length >= 10) {
        recipients.push({
          phone,
          name: c.name ?? '',
          variables: { name: c.name ?? '', ...c.variables },
        });
      }
    }
  } else if (campaign.target_type === 'manual' && campaign.target_manual_numbers?.length) {
    recipients = (campaign.target_manual_numbers as string[])
      .filter(Boolean)
      .map(p => ({ phone: normalizePhone(p), name: '', variables: {} }))
      .filter(r => r.phone.length >= 10);
  } else if (campaign.target_type === 'leads' && campaign.target_lead_ids?.length) {
    const { data: leads } = await supabase
      .from('company_crm_leads')
      .select('id,name,phone,whatsapp,city,service_category,email')
      .in('id', campaign.target_lead_ids as string[])
      .eq('company_id', company.id);

    for (const l of (leads ?? [])) {
      const raw = ((l.whatsapp ?? l.phone ?? '') as string);
      const phone = normalizePhone(raw);
      if (phone.length >= 10) {
        recipients.push({
          phone,
          name: (l.name as string) ?? '',
          variables: {
            name: (l.name as string) ?? '',
            city: (l.city as string) ?? '',
            category: (l.service_category as string) ?? '',
            email: (l.email as string) ?? '',
          },
        });
      }
    }
  }

  if (!recipients.length) return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });

  // ── Batch insert personalized messages ───────────────────────────────
  const BATCH = 50;
  let queued = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH).map(r => ({
      to_number: r.phone,
      message: personalize(template, r.variables),
      status: 'pending',
      company_id: company.id,
      campaign_id,
      contact_name: r.name || null,
    }));
    const { error } = await supabase.from('whatsapp_queue').insert(batch);
    if (!error) queued += batch.length;
  }

  await supabase
    .from('company_whatsapp_campaigns')
    .update({ status: 'running', started_at: new Date().toISOString(), total_recipients: queued, updated_at: new Date().toISOString() })
    .eq('id', campaign_id);

  return NextResponse.json({ success: true, queued });
}
