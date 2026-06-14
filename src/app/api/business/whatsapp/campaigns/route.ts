import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getCompanyId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle();
  return data?.id ?? null;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const companyId = await getCompanyId(supabase);
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('company_whatsapp_campaigns')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const companyId = await getCompanyId(supabase);
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, template_id, custom_message, target_type, target_lead_ids, target_manual_numbers, scheduled_at } = body;

  if (!name) return NextResponse.json({ error: 'Campaign name required' }, { status: 400 });
  if (!custom_message && !template_id) return NextResponse.json({ error: 'Message or template required' }, { status: 400 });

  const validNumbers = (target_manual_numbers ?? []).filter((n: string) => {
    const digits = n.replace(/[\s\-\+]/g, '')
    return /^\d{10,15}$/.test(digits)
  })

  const recipients = target_type === 'manual'
    ? validNumbers.length
    : (target_lead_ids ?? []).length;

  const { data, error } = await supabase
    .from('company_whatsapp_campaigns')
    .insert({
      company_id: companyId,
      name,
      template_id: template_id ?? null,
      custom_message: custom_message ?? null,
      target_type: target_type ?? 'leads',
      target_lead_ids: target_lead_ids ?? [],
      target_manual_numbers: validNumbers,
      scheduled_at: scheduled_at ?? null,
      total_recipients: recipients,
      status: scheduled_at ? 'scheduled' : 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const companyId = await getCompanyId(supabase);
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

  const { error } = await supabase
    .from('company_whatsapp_campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
