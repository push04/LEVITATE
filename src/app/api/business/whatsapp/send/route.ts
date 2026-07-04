import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server';

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { to_number, message, contact_name: rawName, campaign_id } = body;
  const contact_name = (rawName ?? '').trim().slice(0, 100) || null;

  if (!to_number || !message) {
    return NextResponse.json({ error: 'to_number and message are required' }, { status: 400 });
  }
  if (String(message).length > 4096) {
    return NextResponse.json({ error: 'Message too long (max 4096 chars)' }, { status: 400 });
  }

  const normalized = String(to_number).replace(/[^0-9]/g, '');
  if (normalized.length < 10) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  const { error } = await supabase.from('whatsapp_queue').insert({
    to_number: normalized,
    message,
    status: 'pending',
    company_id: companyId,
    contact_name,
    campaign_id: campaign_id ?? null,
  });

  if (error) {
    console.error('[WA Send] Queue insert failed:', error.message)
    return NextResponse.json({ error: 'Failed to queue message: ' + error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true });
}
