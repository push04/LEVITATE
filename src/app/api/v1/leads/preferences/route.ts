/**
 * v1/leads/preferences — API key preferences (city + category filter)
 * GET  → returns current preferences + available options
 * POST → saves preferences (validated against known cities/categories)
 */

import { NextRequest } from 'next/server'
import { validateApiKey, apiResponse, apiError } from '../../middleware'
import { getServiceSupabase } from '@/lib/supabase'
import { CITIES, CATEGORIES } from '@/lib/scrapers/free-sources'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error

  const { ctx } = auth
  const supabase = getServiceSupabase()

  const { data } = await supabase
    .from('api_key_lead_preferences')
    .select('cities, categories, updated_at')
    .eq('user_id', ctx.userId)
    .maybeSingle()

  return apiResponse({
    preferences: data ?? { cities: [], categories: [] },
    available: { cities: CITIES, categories: CATEGORIES },
    hint: 'POST to this endpoint with { cities: [...], categories: [...] } to save your preferences. Then GET /api/v1/leads?mode=global to receive filtered leads.',
  })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error

  const { ctx } = auth

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Invalid JSON body', 400)

  const citySet = new Set(CITIES)
  const catSet = new Set(CATEGORIES)

  const cities: string[] = Array.isArray(body.cities)
    ? body.cities.filter((c: unknown) => typeof c === 'string' && citySet.has(c))
    : []
  const categories: string[] = Array.isArray(body.categories)
    ? body.categories.filter((c: unknown) => typeof c === 'string' && catSet.has(c))
    : []

  const invalid = {
    cities: Array.isArray(body.cities) ? body.cities.filter((c: unknown) => typeof c === 'string' && !citySet.has(c)) : [],
    categories: Array.isArray(body.categories) ? body.categories.filter((c: unknown) => typeof c === 'string' && !catSet.has(c)) : [],
  }

  if (cities.length === 0 && categories.length === 0) {
    return apiError('No valid cities or categories provided. GET this endpoint to see available options.', 400)
  }

  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('api_key_lead_preferences')
    .upsert({
      user_id: ctx.userId,
      cities,
      categories,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return apiError(error.message, 500)

  return apiResponse({
    saved: { cities, categories },
    rejected: invalid,
    message: `Preferences saved. ${cities.length} cities, ${categories.length} categories. Now use GET /api/v1/leads?mode=global to access filtered leads.`,
  })
}
