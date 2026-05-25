import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getCompany(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  return data ? { id: data.id } : null;
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

  const body = await req.json();
  const { to_number, message, contact_name, campaign_id } = body;

  if (!to_number || !message) {
    return NextResponse.json({ error: 'to_number and message are required' }, { status: 400 });
  }

  const normalized = String(to_number).replace(/[^0-9]/g, '');
  if (normalized.length < 10) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  const { error } = await supabase.from('whatsapp_queue').insert({
    to_number: normalized,
    message,
    status: 'pending',
    company_id: company.id,
    contact_name: contact_name ?? null,
    campaign_id: campaign_id ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
