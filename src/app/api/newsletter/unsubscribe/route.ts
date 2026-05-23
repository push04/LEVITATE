import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'invalid_token' },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceSupabase();

    // Check if subscription exists
    const { data: subscription } = await supabase
      .from('newsletter_subscriptions')
      .select('id, email')
      .eq('unsubscribe_token', token)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'invalid_token' },
        { status: 400 }
      );
    }

    // Delete the subscription (or mark as unsubscribed)
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .delete()
      .eq('unsubscribe_token', token);

    if (error) {
      console.error('[Newsletter Unsubscribe] DB error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to unsubscribe. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'You have been successfully unsubscribed.',
    });
  } catch (error) {
    console.error('[Newsletter Unsubscribe] Server error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
