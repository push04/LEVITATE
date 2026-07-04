import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireBusinessCompany } from '@/lib/business-intelligence-server';

async function getCompanyId(_supabase: ReturnType<typeof createServerClient>) {
  try {
    return (await requireBusinessCompany('whatsapp')).companyId;
  } catch {
    return null;
  }
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
    .from('company_whatsapp_config')
    .select('id, connected, ai_agent_enabled, ai_agent_name, ai_agent_tone, ai_agent_system_prompt, ai_agent_faq, ai_agent_escalation_keywords, ai_agent_escalation_email, phone_number_id, qr_code, daemon_last_ping, whatsapp_number')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data ?? null, company_id: companyId });
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

  // Only allow updating safe fields; 'connected' is daemon-only (via agent/ping)
  const allowed = [
    'phone_number_id', 'access_token', 'app_secret', 'verify_token',
    'ai_agent_enabled', 'ai_agent_name', 'ai_agent_tone', 'ai_agent_system_prompt',
    'ai_agent_faq', 'ai_agent_escalation_keywords', 'ai_agent_escalation_email',
  ];
  const update: Record<string, unknown> = { company_id: companyId, updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await supabase
    .from('company_whatsapp_config')
    .upsert(update, { onConflict: 'company_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
