/**
 * POST /api/business/whatsapp/queue/update
 * Called by EXE to update message status after sending (sent/failed).
 * Scopes the UPDATE to the message's own company_id to prevent cross-company writes.
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
      return NextResponse.json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` }, { status: 400 });
    }

    // Fetch the message first to get its company_id (used for scoped update + mirror)
    const { data: qMsg, error: fetchErr } = await supabaseAdmin
      .from('whatsapp_queue')
      .select('id, company_id, to_number, message, campaign_id')
      .eq('id', id)
      .single();

    if (fetchErr || !qMsg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (msgError) patch.error = String(msgError).slice(0, 500);
    if (sent_at) patch.sent_at = sent_at;

    // Scoped UPDATE — company_id must match what's in the DB
    const updateQuery = supabaseAdmin
      .from('whatsapp_queue')
      .update(patch)
      .eq('id', id);

    // Admin messages have company_id = null
    if (qMsg.company_id === null) {
      updateQuery.is('company_id', null);
    } else {
      updateQuery.eq('company_id', qMsg.company_id);
    }

    const { error: updateErr } = await updateQuery;
    if (updateErr) throw updateErr;

    // Mirror to conversation history (business only — admin has no conversation view)
    if (status === 'sent' && qMsg.company_id) {
      await supabaseAdmin.from('company_whatsapp_messages').insert({
        company_id: qMsg.company_id,
        direction: 'outbound',
        to_number: qMsg.to_number,
        from_number: null,
        message: qMsg.message,
        campaign_id: qMsg.campaign_id || null,
        status: 'sent',
        is_ai_response: false,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
