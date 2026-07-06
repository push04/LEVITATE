import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { sendAdminPush } from '@/lib/push/admin-push';

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sendAdminPush({
    title: 'Levitate Admin',
    body: 'Notifications are working - you\'ll get pushes for new inquiries like this one.',
    url: '/admin/dashboard',
  });

  return NextResponse.json({ success: true, ...result });
}
