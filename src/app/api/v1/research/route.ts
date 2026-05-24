import { NextRequest } from 'next/server'
import { validateApiKey, apiResponse, apiError } from '../middleware'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error

  const { ctx } = auth
  const url = req.nextUrl
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10'), 50)

  if (ctx.plan === 'free' || ctx.plan === 'starter') {
    return apiError('Research API requires Pro plan or above', 403)
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('research_runs')
    .select('id, business_id, status, modules, created_at, completed_at')
    .eq('business_id', ctx.businessId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return apiError(error.message, 500)
  return apiResponse({ reports: data })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error

  const { ctx } = auth
  if (ctx.plan === 'free' || ctx.plan === 'starter') {
    return apiError('Research API requires Pro plan or above', 403)
  }

  const body = await req.json().catch(() => ({}))
  const { query, industry, location } = body as { query?: string; industry?: string; location?: string }

  if (!query && !industry) return apiError('Provide query or industry', 400)

  return apiResponse({
    message: 'Research run queued',
    estimated_completion: '2-5 minutes',
    webhook_tip: 'Set up a webhook to receive results automatically',
  }, 202)
}
