import { NextRequest } from 'next/server'
import { validateApiKey, apiResponse, apiError } from '../middleware'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('webhooks')
    .select('id, url, events, is_active, created_at, last_triggered_at')
    .eq('business_id', ctx.businessId)

  if (error) return apiError(error.message, 500)
  return apiResponse({ webhooks: data })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error
  const { ctx } = auth

  if (ctx.plan === 'free') return apiError('Webhooks require Starter plan or above', 403)

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Invalid JSON', 400)

  const { url, events } = body as { url?: string; events?: string[] }
  if (!url) return apiError('url is required', 400)

  const validEvents = ['lead.created', 'lead.status_changed', 'research.completed', 'email.opened', 'email.replied']
  const selectedEvents = (events ?? validEvents).filter(e => validEvents.includes(e))

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('webhooks')
    .insert({ url, events: selectedEvents, business_id: ctx.businessId, is_active: true })
    .select('id')
    .single()

  if (error) return apiError(error.message, 500)
  return apiResponse({ webhook_id: data.id, url, events: selectedEvents }, 201)
}

export async function DELETE(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return apiError('id query param required', 400)

  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('business_id', ctx.businessId)

  if (error) return apiError(error.message, 500)
  return apiResponse({ deleted: true })
}
