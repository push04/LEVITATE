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
};

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function findActiveInvite(code: string): Promise<DemoInvite | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('demo_invites')
    .select('id, code, business_name, contact_name, tool, max_tries, is_active, expires_at')
    .eq('code', normalizeInviteCode(code))
    .maybeSingle();

  if (!data || !data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as DemoInvite;
}

export function inviteAllowsTool(invite: DemoInvite, tool: DemoTool): boolean {
  return invite.tool === 'both' || invite.tool === tool;
}

// Only stamps first_redeemed_at the first time - the `.is()` filter means
// this update touches zero rows (silently) on every redemption after the
// first, so it never overwrites the original redemption timestamp.
export async function markInviteRedeemed(inviteId: string): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase
    .from('demo_invites')
    .update({ first_redeemed_at: new Date().toISOString(), last_used_at: new Date().toISOString() })
    .eq('id', inviteId)
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

export async function recordInviteQuery(inviteId: string, tool: DemoTool, query: string, resultCount: number): Promise<void> {
  const supabase = getServiceSupabase();
  await Promise.all([
    supabase.from('demo_invite_usage').insert({ invite_id: inviteId, tool, query: query.slice(0, 300), result_count: resultCount }),
    supabase.from('demo_invites').update({ last_used_at: new Date().toISOString() }).eq('id', inviteId),
  ]);
}
