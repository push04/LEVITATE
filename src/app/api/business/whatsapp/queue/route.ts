import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server';

export async function GET() {
  let companyId: string;
  try {
    ({ companyId } = await requireBusinessCompany('whatsapp'));
  } catch (err) {
    return businessApiErrorResponse(err);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data, error } = await supabase
    .from('whatsapp_queue')
    .select('id, to_number, message, status, error, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ queue: data ?? [] });
}
