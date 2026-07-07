import { getServiceSupabase } from '@/lib/supabase';

export const DEMO_RESULT_LIMIT = 20;

export type DemoTool = 'bizharvest' | 'tenderpulse';

export type DemoInvite = {
  id: string;
  code: string;
  business_name: string;
  contact_name: string | null;
  tool: 'bizharvest' | 'tenderpulse' | 'both';
  max_tries: number;
  is_active: boolean;
  expires_at: string | null;
  first_redeemed_at: string | null;
};

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function findActiveInvite(code: string): Promise<DemoInvite | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('demo_invites')
    .select('id, code, business_name, contact_name, tool, max_tries, is_active, expires_at, first_redeemed_at')
    .eq('code', normalizeInviteCode(code))
    .maybeSingle();

  if (!data || !data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as DemoInvite;
}

export function inviteAllowsTool(invite: DemoInvite, tool: DemoTool): boolean {
  return invite.tool === 'both' || invite.tool === tool;
}

// Skips the round-trip entirely once already redeemed (the common case -
// every visit after the first) instead of firing a no-op UPDATE every time.
export async function markInviteRedeemed(invite: DemoInvite): Promise<void> {
  if (invite.first_redeemed_at) return;
  const supabase = getServiceSupabase();
  await supabase
    .from('demo_invites')
    .update({ first_redeemed_at: new Date().toISOString(), last_used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('first_redeemed_at', null);
}

export async function getInviteTriesUsed(inviteId: string, tool: DemoTool): Promise<number> {
  const supabase = getServiceSupabase();
  const { count } = await supabase
    .from('demo_invite_usage')
    .select('id', { count: 'exact', head: true })
    .eq('invite_id', inviteId)
    .eq('tool', tool);
  return count ?? 0;
}

// Deliberately fire-and-forget from the caller's perspective (see usage in
// the two public query routes) - the visitor's response doesn't need to
// wait on usage logging, it only needs to have already happened before the
// *next* request's getInviteTriesUsed() count.
export async function recordInviteQuery(inviteId: string, tool: DemoTool, query: string, resultCount: number): Promise<void> {
  const supabase = getServiceSupabase();
  await Promise.all([
    supabase.from('demo_invite_usage').insert({ invite_id: inviteId, tool, query: query.slice(0, 300), result_count: resultCount }),
    supabase.from('demo_invites').update({ last_used_at: new Date().toISOString() }).eq('id', inviteId),
  ]);
}
