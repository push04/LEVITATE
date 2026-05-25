import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 });

  const { campaign_id } = await req.json();
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

  const message: string = campaign.custom_message ?? '';
  if (!message.trim()) return NextResponse.json({ error: 'Campaign has no message' }, { status: 400 });

  // Collect recipients
  type Recipient = { phone: string; name: string };
  let recipients: Recipient[] = [];

  if (campaign.target_type === 'manual' && campaign.target_manual_numbers?.length) {
    recipients = (campaign.target_manual_numbers as string[])
      .filter(Boolean)
      .map(p => ({ phone: p.replace(/[^0-9]/g, ''), name: '' }));
  } else if (campaign.target_type === 'leads' && campaign.target_lead_ids?.length) {
    const { data: leads } = await supabase
      .from('company_crm_leads')
      .select('id, name, phone, whatsapp')
      .in('id', campaign.target_lead_ids as string[])
      .eq('company_id', company.id);

    if (leads) {
      for (const l of leads) {
        const phone = ((l.whatsapp ?? l.phone ?? '') as string).replace(/[^0-9]/g, '');
        if (phone.length >= 10) recipients.push({ phone, name: (l.name as string) ?? '' });
      }
    }
  }

  if (!recipients.length) return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });

  // Batch insert to whatsapp_queue
  const BATCH = 50;
  let queued = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH).map(r => ({
      to_number: r.phone,
      message,
      status: 'pending',
      company_id: company.id,
      campaign_id,
      contact_name: r.name || null,
    }));
    const { error } = await supabase.from('whatsapp_queue').insert(batch);
    if (!error) queued += batch.length;
  }

  // Update campaign status
  await supabase
    .from('company_whatsapp_campaigns')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      total_recipients: queued,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaign_id);

  return NextResponse.json({ success: true, queued });
}
