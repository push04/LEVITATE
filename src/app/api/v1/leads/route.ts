/**
 * v1/leads — Business API
 * Supports two modes:
 *   1. crm=true (default) → returns company's own CRM leads
 *   2. crm=false → returns global potential_leads filtered by city/category
 *      Respects saved API key preferences for auto-filtering
 */

import { NextRequest } from 'next/server'
import { validateApiKey, apiResponse, apiError } from '../middleware'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error

  const { ctx } = auth
  const url = req.nextUrl
  const supabase = getServiceSupabase()

  const mode = url.searchParams.get('mode') ?? 'crm' // 'crm' | 'global'
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 500)
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0'), 0)

  // ── Mode 1: CRM leads (company's own) ─────────────────────────────────────
  if (mode === 'crm') {
    const statusFilter = url.searchParams.get('status')
    const stageFilter = url.searchParams.get('stage')
    const cityFilter = url.searchParams.get('city')
    const categoryFilter = url.searchParams.get('category')

    let query = supabase
      .from('company_crm_leads')
      .select('*', { count: 'exact' })
      .eq('company_id', ctx.businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter) query = query.eq('status', statusFilter)
    if (stageFilter) query = query.eq('pipeline_stage', stageFilter)
    if (cityFilter) query = query.ilike('city', `%${cityFilter}%`)
    if (categoryFilter) query = query.ilike('service_category', `%${categoryFilter}%`)

    const { data, error, count } = await query
    if (error) return apiError(error.message, 500)

    return apiResponse({
      leads: data ?? [],
      total: count ?? 0,
      page: Math.floor(offset / limit) + 1,
      mode: 'crm',
    })
  }

  // ── Mode 2: Global potential leads (filtered by city/category) ────────────
  if (mode === 'global') {
    // Resolve city/category filters: query param → saved prefs → all
    let cities: string[] = url.searchParams.get('cities')
      ? url.searchParams.get('cities')!.split(',').map(c => c.trim()).filter(Boolean)
      : []
    let categories: string[] = url.searchParams.get('categories')
      ? url.searchParams.get('categories')!.split(',').map(c => c.trim()).filter(Boolean)
      : []

    // If no filters in query, load saved preferences for this user
    if (cities.length === 0 && categories.length === 0) {
      const { data: prefs } = await supabase
        .from('api_key_lead_preferences')
        .select('cities, categories')
        .eq('user_id', ctx.userId)
        .maybeSingle()

      if (prefs) {
        cities = Array.isArray(prefs.cities) ? prefs.cities : []
        categories = Array.isArray(prefs.categories) ? prefs.categories : []
      }
    }

    const statusFilter = url.searchParams.get('status') ?? 'pending'
    const minScore = parseInt(url.searchParams.get('min_score') ?? '0')
    const since = url.searchParams.get('since') // ISO date — only leads after this date

    let query = supabase
      .from('potential_leads')
      .select('id, business_name, address, phone, email, website, city, category, ai_score, status, raw_data, created_at', { count: 'exact' })
      .order('ai_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (minScore > 0) query = query.gte('ai_score', minScore)
    if (since) query = query.gte('created_at', since)
    if (cities.length > 0) query = query.in('city', cities)
    if (categories.length > 0) query = query.in('category', categories)

    const { data, error, count } = await query
    if (error) return apiError(error.message, 500)

    return apiResponse({
      leads: data ?? [],
      total: count ?? 0,
      page: Math.floor(offset / limit) + 1,
      mode: 'global',
      filters: { cities, categories, min_score: minScore, since },
    })
  }

  return apiError('Invalid mode. Use ?mode=crm or ?mode=global', 400)
}
