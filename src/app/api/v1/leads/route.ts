import { NextRequest } from 'next/server'
import { validateApiKey, apiResponse, apiError } from '../middleware'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error

  const { ctx } = auth
  const url = req.nextUrl
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0'), 0)
  const page = Math.floor(offset / limit) + 1

  const supabase = getServiceSupabase()

  const query = supabase
    .from('company_crm_leads')
    .select('*', { count: 'exact' })
    .eq('company_id', ctx.businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return apiError(error.message, 500)

  return apiResponse({ leads: data ?? [], total: count ?? 0, page })
}
