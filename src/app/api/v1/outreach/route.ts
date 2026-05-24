import { NextRequest } from 'next/server'
import { validateApiKey, apiResponse, apiError } from '../middleware'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if ('error' in auth) return auth.error

  const { ctx } = auth
  if (ctx.plan === 'free') return apiError('Outreach API requires Starter plan or above', 403)

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Invalid JSON body', 400)

  const { to, subject, body: emailBody, lead_id } = body as {
    to?: string; subject?: string; body?: string; lead_id?: string
  }

  if (!to || !subject || !emailBody) return apiError('to, subject, and body are required', 400)
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(to)) return apiError('Invalid email address', 400)

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('outreach_emails')
    .insert({
      to_email: to,
      subject,
      body: emailBody,
      lead_id: lead_id ?? null,
      status: 'queued',
      source: 'api',
      api_key_context: ctx.keyId,
    })
    .select('id')
    .single()

  if (error) return apiError(error.message, 500)
  return apiResponse({ message: 'Email queued for delivery', email_id: data.id }, 202)
}
