import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getCompany(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle();
  return data ? { id: data.id } : null;
}

async function sendViaMetaAPI(
  phoneNumberId: string,
  accessToken: string,
  toNumber: string,
  message: string
): Promise<{ success: boolean; wa_message_id?: string; error?: string }> {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toNumber.replace(/\D/g, ''),
      type: 'text',
      text: { body: message },
    }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error?.message ?? 'Meta API error' };
  return { success: true, wa_message_id: data.messages?.[0]?.id };
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const company = await getCompany(supabase);
  if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to_number, message, lead_id, campaign_id } = await req.json();
  if (!to_number || !message) return NextResponse.json({ error: 'to_number and message required' }, { status: 400 });

  const { data: config } = await supabase
    .from('company_whatsapp_config')
    .select('phone_number_id, access_token, connected')
    .eq('company_id', company.id)
    .maybeSingle();

  if (!config?.connected || !config.phone_number_id || !config.access_token) {
    return NextResponse.json({ error: 'WhatsApp not connected. Please add your Meta API credentials first.' }, { status: 400 });
  }

  const result = await sendViaMetaAPI(config.phone_number_id, config.access_token, to_number, message);

  await supabase.from('company_whatsapp_messages').insert({
    company_id: company.id,
    campaign_id: campaign_id ?? null,
    to_number,
    lead_id: lead_id ?? null,
    direction: 'outbound',
    message,
    wa_message_id: result.wa_message_id ?? null,
    status: result.success ? 'sent' : 'failed',
    error: result.error ?? null,
  });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true, wa_message_id: result.wa_message_id });
}
