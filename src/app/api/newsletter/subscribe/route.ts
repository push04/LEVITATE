import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().min(1, 'Source is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, source } = subscribeSchema.parse(body);

    const supabase = getServiceSupabase();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscriptions')
      .select('id, confirmed, email')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.confirmed) {
        return NextResponse.json(
          { success: false, error: 'This email is already subscribed.' },
          { status: 400 }
        );
      }
      // Resend confirmation if not confirmed
      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent. Please check your inbox.',
      });
    }

    // Generate tokens
    const confirmationToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    // Insert new subscription
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .insert({
        email,
        source,
        confirmed: false,
        confirmation_token: confirmationToken,
        unsubscribe_token: unsubscribeToken,
      });

    if (error) {
      console.error('[Newsletter Subscribe] DB error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      );
    }

    // TODO: Send confirmation email with confirmation_token link
    // For now, just return success

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent. Please check your inbox.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }
    console.error('[Newsletter Subscribe] Server error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
