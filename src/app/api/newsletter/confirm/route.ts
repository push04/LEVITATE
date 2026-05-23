import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/?error=invalid_token', process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online')
    );
  }

  try {
    const supabase = getServiceSupabase();

    // Check if subscription exists and is not already confirmed
    const { data: subscription, error: fetchError } = await supabase
      .from('newsletter_subscriptions')
      .select('id, confirmed, email')
      .eq('confirmation_token', token)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.redirect(
        new URL('/?error=invalid_token', process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online')
      );
    }

    if (subscription.confirmed) {
      return NextResponse.redirect(
        new URL('/?newsletter=already_confirmed', process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online')
      );
    }

    // Confirm the subscription
    const { error: updateError } = await supabase
      .from('newsletter_subscriptions')
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('confirmation_token', token);

    if (updateError) {
      console.error('[Newsletter Confirm] Update error:', updateError.message);
      return NextResponse.redirect(
        new URL('/?error=server_error', process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online')
      );
    }

    return NextResponse.redirect(
      new URL('/?newsletter=confirmed', process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online')
    );
  } catch (error) {
    console.error('[Newsletter Confirm] Server error:', error);
    return NextResponse.redirect(
      new URL('/?error=server_error', process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online')
    );
  }
}
