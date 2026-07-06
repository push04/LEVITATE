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
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  await supabase.from('admin_push_subscriptions').delete().eq('endpoint', endpoint);

  return NextResponse.json({ success: true });
}
