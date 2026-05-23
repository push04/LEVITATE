import type { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { getServiceSupabase } from '../../src/lib/supabase';

export const handler: Handler = async (event) => {
  const signature = event.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(event.body || '')
    .digest('hex');

  if (signature !== expectedSignature) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const data = JSON.parse(event.body || '{}');
  const paymentId = data.payload?.payment?.entity?.id;

  // Idempotency check
  const { data: existing } = await getServiceSupabase()
    .from('payment_events')
    .select('id')
    .eq('razorpay_payment_id', paymentId)
    .single();

  if (existing) return { statusCode: 200, body: 'Already processed' };

  // Store raw event
  await getServiceSupabase().from('payment_events').insert({
    razorpay_payment_id: paymentId,
    event_type: data.event,
    raw_payload: data,
    processed: false
  });

  // Process events
  if (data.event === 'payment.captured') {
    await getServiceSupabase().from('workspaces')
      .update({ plan: 'starter', trial: false })
      .eq('razorpay_payment_id', paymentId);
  }

  // Mark processed
  await getServiceSupabase().from('payment_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('razorpay_payment_id', paymentId);

  return { statusCode: 200, body: 'OK' };
};
