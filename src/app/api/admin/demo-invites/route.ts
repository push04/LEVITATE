import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Avoids visually ambiguous characters (0/O, 1/I/L) since these codes get
// typed by hand.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

export async function GET(request: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth(request);
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data: invites, error } = await supabase
    .from('demo_invites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (invites ?? []).map((i) => i.id);
  const { data: usage } = ids.length
    ? await supabase.from('demo_invite_usage').select('invite_id, tool').in('invite_id', ids)
    : { data: [] as { invite_id: string; tool: string }[] };

  const usageByInvite = new Map<string, { bizharvest: number; tenderpulse: number }>();
  for (const row of usage ?? []) {
    const entry = usageByInvite.get(row.invite_id) ?? { bizharvest: 0, tenderpulse: 0 };
    if (row.tool === 'bizharvest') entry.bizharvest++;
    else if (row.tool === 'tenderpulse') entry.tenderpulse++;
    usageByInvite.set(row.invite_id, entry);
  }

  const withUsage = (invites ?? []).map((i) => ({
    ...i,
    usage: usageByInvite.get(i.id) ?? { bizharvest: 0, tenderpulse: 0 },
  }));

  return NextResponse.json({ invites: withUsage });
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth(request);
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : '';
  if (!businessName) return NextResponse.json({ error: 'Business name is required' }, { status: 400 });

  const tool = ['bizharvest', 'tenderpulse', 'both', 'market_pulse'].includes(body?.tool) ? body.tool : 'both';
  const maxTries = Number.isFinite(body?.maxTries) && body.maxTries > 0 ? Math.floor(body.maxTries) : 3;
  const trialDays = tool === 'market_pulse' && Number.isFinite(body?.trialDays) && body.trialDays > 0 ? Math.floor(body.trialDays) : tool === 'market_pulse' ? 3 : null;
  const code = typeof body?.code === 'string' && body.code.trim() ? body.code.trim().toUpperCase() : generateCode();

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('demo_invites')
    .insert({
      code,
      business_name: businessName,
      contact_name: body?.contactName || null,
      contact_email: body?.contactEmail || null,
      contact_phone: body?.contactPhone || null,
      tool,
      max_tries: maxTries,
      trial_days: trialDays,
      notes: body?.notes || null,
    })
    .select()
    .single();

  if (error) {
    const message = error.code === '23505' ? 'That code is already in use - try another.' : error.message;
    return NextResponse.json({ error: message }, { status: error.code === '23505' ? 409 : 500 });
  }

  return NextResponse.json({ invite: data });
}
