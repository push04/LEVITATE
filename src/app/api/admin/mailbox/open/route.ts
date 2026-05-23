import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const PIXEL_GIF = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

export async function GET(request: Request) {
  const url = new URL(request.url);
  const messageId = url.searchParams.get('message');

  if (messageId) {
    try {
      const supabase = getServiceSupabase();
      await supabase
        .from('agent_emails')
        .update({ status: 'opened' })
        .eq('id', messageId)
        .eq('direction', 'outbound')
        .in('status', ['queued', 'sent', 'accepted']);
    } catch (error) {
      console.error('[Mailbox] Open tracking failed:', error);
    }
  }

  return new NextResponse(PIXEL_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

