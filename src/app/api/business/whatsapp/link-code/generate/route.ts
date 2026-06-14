/**
 * POST /api/business/whatsapp/link-code/generate
 * Generates a fresh 8-char alphanumeric link code for a business user.
 * Code is stored in Supabase and valid for 10 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,1,0 to avoid confusion
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get company_id for this user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (companyError || !company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const code = genCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Upsert: one active code per company
    const { error: upsertError } = await supabase
      .from('wa_link_codes')
      .upsert({
        company_id: company.id,
        code,
        expires_at: expiresAt,
        used: false,
      }, { onConflict: 'company_id' });

    if (upsertError) throw upsertError;

    return NextResponse.json({ code, expires_at: expiresAt });
  } catch (e: any) {
    console.error('[link-code/generate]', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
