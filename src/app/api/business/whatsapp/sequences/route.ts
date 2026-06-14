import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function auth() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, company: null };
  const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle();
  return { supabase, company };
}

// GET — list sequences
export async function GET() {
  const { supabase, company } = await auth();
  if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('company_whatsapp_sequences')
    .select('*, company_whatsapp_sequence_contacts(count)')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sequences: data ?? [] });
}

// POST — create sequence
export async function POST(req: NextRequest) {
  const { supabase, company } = await auth();
  if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, steps } = await req.json() as {
    name: string;
    steps: Array<{ day: number; message: string }>;
  };

  if (!name || !steps?.length) return NextResponse.json({ error: 'name and steps required' }, { status: 400 });
  for (const s of steps) {
    if (typeof s.day !== 'number' || !s.message?.trim())
      return NextResponse.json({ error: 'Each step needs day (number) and message (string)' }, { status: 400 });
  }

  const sorted = [...steps].sort((a, b) => a.day - b.day);

  const { data, error } = await supabase
    .from('company_whatsapp_sequences')
    .insert({ company_id: company.id, name: name.trim(), steps: sorted })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sequence: data });
}

// PATCH — update name/steps/status
export async function PATCH(req: NextRequest) {
  const { supabase, company } = await auth();
  if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...updates } = await req.json() as { id: string; [k: string]: unknown };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('company_whatsapp_sequences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE
export async function DELETE(req: NextRequest) {
  const { supabase, company } = await auth();
  if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('company_whatsapp_sequences')
    .delete()
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
