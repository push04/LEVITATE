/**
 * POST /api/business/whatsapp/link-code/exchange
 * Called by the Electron EXE with the 8-char code.
 * Returns company_id and daemon_secret if valid.
 * Public endpoint (no auth) — code is the credential.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string' || code.length !== 8) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const daemonSecret = process.env.DAEMON_SECRET;
    if (!daemonSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Look up code to validate expiry before attempting atomic update
    const { data: linkCode, error } = await supabaseAdmin
      .from('wa_link_codes')
      .select('company_id, expires_at')
      .eq('code', cleanCode)
      .eq('used', false)
      .single();

    if (error || !linkCode) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    if (new Date(linkCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired. Generate a new code from your dashboard.' }, { status: 400 });
    }

    // Atomic update: only succeeds if the row still has used=false (prevents TOCTOU race)
    const { count } = await supabaseAdmin
      .from('wa_link_codes')
      .update({ used: true })
      .eq('code', cleanCode)
      .eq('used', false)
      .select('id', { count: 'exact', head: true });

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Code already used. Generate a new code from your dashboard.' }, { status: 400 });
    }

    // Ensure wa_config row exists for this company
    await supabaseAdmin
      .from('company_whatsapp_config')
      .upsert({
        company_id: linkCode.company_id,
        connected: false,
        ai_agent_enabled: false,
        ai_agent_name: 'Assistant',
        ai_agent_tone: 'professional',
      }, { onConflict: 'company_id', ignoreDuplicates: true });

    return NextResponse.json({
      company_id: linkCode.company_id,
      daemon_secret: daemonSecret,
    });
  } catch (e: any) {
    console.error('[link-code/exchange]', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
