/**
 * POST /api/business/whatsapp/agent/ping
 * Called by the Electron EXE to:
 * - Update connection status
 * - Push QR code (before WhatsApp is linked)
 * - Send heartbeat pings (every 30s while connected)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const expected = process.env.DAEMON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const secret = req.headers.get('x-daemon-secret');
  if (secret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { company_id, connected, qr_code, whatsapp_number, daemon_last_ping } = body;

    if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (typeof connected === 'boolean') patch.connected = connected;
    if (qr_code !== undefined) patch.qr_code = qr_code;
    if (whatsapp_number !== undefined) patch.whatsapp_number = whatsapp_number;
    if (daemon_last_ping !== undefined) patch.daemon_last_ping = daemon_last_ping;

    const { error } = await supabaseAdmin
      .from('company_whatsapp_config')
      .upsert({ company_id, ...patch }, { onConflict: 'company_id' });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[agent/ping]', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
