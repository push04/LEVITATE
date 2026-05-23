import { getServiceSupabase } from '../supabase'

export type AdminEvent = {
  source: string
  subject: string
  body: string
  level?: 'info' | 'warning' | 'error'
  meta?: Record<string, unknown>
}

/**
 * Records an event that should be visible to admins and included in the end-of-day email digest.
 * This replaces noisy "email admin on every event" behavior.
 */
export async function recordAdminEvent(evt: AdminEvent) {
  const supabase = getServiceSupabase()
  const payload = {
    agent_name: evt.source,
    action: 'admin_event',
    input: {
      subject: evt.subject,
      level: evt.level ?? 'info',
      ...(evt.meta ?? {}),
    },
    output: {
      body: evt.body,
    },
    status: 'success',
    credits_earned: 0,
  }

  try {
    await supabase.from('agent_logs').insert(payload)
  } catch (e) {
    // Never break the caller because reporting failed.
    console.error('[AdminEvent] record failed:', e)
  }
}
