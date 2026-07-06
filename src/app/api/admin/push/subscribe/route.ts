import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('admin_push_subscriptions')
    .upsert(
      { endpoint, p256dh, auth, user_agent: request.headers.get('user-agent') },
      { onConflict: 'endpoint' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
