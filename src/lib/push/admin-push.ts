import webpush from 'web-push';
import { getServiceSupabase } from '@/lib/supabase';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys are not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type AdminPushPayload = {
  title: string;
  body: string;
  url?: string;
};

// Fans a notification out to every browser/device the admin has subscribed
// on. Never throws to the caller - a push failure should never break the
// request that triggered it (e.g. a contact-form submission still succeeds
// even if notifying the admin fails). Subscriptions that the push service
// reports as gone (404/410 - user revoked permission, uninstalled the app,
// etc.) are cleaned up automatically instead of failing forever.
export async function sendAdminPush(payload: AdminPushPayload): Promise<{ sent: number; removed: number }> {
  try {
    ensureConfigured();
  } catch (err) {
    console.warn('[admin-push] not configured, skipping:', err instanceof Error ? err.message : err);
    return { sent: 0, removed: 0 };
  }

  const supabase = getServiceSupabase();
  const { data: subs, error } = await supabase.from('admin_push_subscriptions').select('id, endpoint, p256dh, auth');
  if (error) {
    console.warn('[admin-push] failed to load subscriptions:', error.message);
    return { sent: 0, removed: 0 };
  }
  if (!subs || subs.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.warn('[admin-push] send failed:', err instanceof Error ? err.message : err);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await supabase.from('admin_push_subscriptions').delete().in('id', staleIds);
  }

  return { sent, removed: staleIds.length };
}
