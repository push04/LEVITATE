/**
 * GET /api/business/whatsapp/queue/next
 * Returns the next pending message ready to send (respects scheduled_at).
 * Called by the Electron EXE / whatsapp-host daemon on its poll interval.
 *
 * Security: daemon secret required via x-daemon-secret header.
 * Admin mode (?admin=1) is ONLY available when no company_id is provided
 * and cannot be used to cross-read another company's queue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const expected = process.env.DAEMON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (req.headers.get('x-daemon-secret') !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const company_id = req.nextUrl.searchParams.get('company_id');
  const isAdmin = !company_id && req.nextUrl.searchParams.get('admin') === '1';

  if (!company_id && !isAdmin) {
    return NextResponse.json({ error: 'company_id or admin=1 required' }, { status: 400 });
  }

  // Validate UUID format to prevent injection via query string
  if (company_id && !UUID_RE.test(company_id)) {
    return NextResponse.json({ error: 'Invalid company_id format' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from('whatsapp_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
      .order('scheduled_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(1);

    if (isAdmin) {
      query = query.is('company_id', null);
    } else {
      query = query.eq('company_id', company_id!);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    return NextResponse.json({ msg: data || null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
