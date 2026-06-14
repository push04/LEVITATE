/**
 * POST /api/business/whatsapp/queue/update
 * Called by EXE to update message status after sending (sent/failed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_STATUSES = ['sent', 'failed'] as const;

export async function POST(req: NextRequest) {
  const expected = process.env.DAEMON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (req.headers.get('x-daemon-secret') !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, status, error: msgError, sent_at } = await req.json();

    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}` }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (msgError) patch.error = msgError;
    if (sent_at) patch.sent_at = sent_at;

    const { error } = await supabaseAdmin
      .from('whatsapp_queue')
      .update(patch)
      .eq('id', id);

    if (error) throw error;

    // If sent, also mirror to message log
    if (status === 'sent') {
      const { data: qMsg } = await supabaseAdmin
        .from('whatsapp_queue')
        .select('company_id, to_number, message, campaign_id')
        .eq('id', id)
        .single();

      if (qMsg) {
        await supabaseAdmin.from('company_whatsapp_messages').insert({
          company_id: qMsg.company_id,
          direction: 'outbound',
          to_number: qMsg.to_number,
          message: qMsg.message,
          campaign_id: qMsg.campaign_id || null,
          status: 'sent',
          is_ai_response: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
