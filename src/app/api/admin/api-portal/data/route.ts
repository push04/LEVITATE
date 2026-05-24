import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/api-portal/data
 * Returns ALL api_plans and api_keys using the service role (bypasses RLS).
 * The anon client on the dashboard can only see keys where user_id = auth.uid(),
 * so the admin dashboard must use this endpoint instead.
 */
export async function GET() {
  const supabase = getServiceSupabase()

  const [plansRes, keysRes] = await Promise.all([
    supabase
      .from('api_plans')
      .select('*')
      .order('price_monthly', { ascending: true }),
    supabase
      .from('api_keys')
      .select('id, user_id, key_prefix, name, requests_count, is_active, plan_id, plan_override_limit, created_at, last_used_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (plansRes.error) {
    return NextResponse.json({ error: plansRes.error.message }, { status: 500 })
  }

  const plans = plansRes.data ?? []
  const keys = keysRes.data ?? []

  // Enrich keys with subscriber count per plan
  const subCounts: Record<string, number> = {}
  for (const k of keys) {
    if (k.plan_id && k.is_active) {
      subCounts[k.plan_id] = (subCounts[k.plan_id] ?? 0) + 1
    }
  }

  const plansWithCounts = plans.map(p => ({
    ...p,
    subscriber_count: subCounts[p.id] ?? 0,
  }))

  // Build plan name map for key enrichment
  const planMap: Record<string, string> = {}
  plans.forEach(p => { planMap[p.id] = p.name })

  const enrichedKeys = keys.map(k => ({
    ...k,
    plan_name: k.plan_id ? (planMap[k.plan_id] ?? 'Unknown') : 'Free',
  }))

  return NextResponse.json({ plans: plansWithCounts, keys: enrichedKeys })
}
