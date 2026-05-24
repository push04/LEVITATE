import { createHash } from 'crypto'
import { getServiceSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

const MONTHLY_RATE_LIMIT = 200

export interface ApiKeyContext {
  keyId: string
  userId: string
  businessId: string
  plan: string
  rateLimit: number
  requestsCount: number
}

export async function validateApiKey(req: NextRequest): Promise<{ ctx: ApiKeyContext } | { error: NextResponse }> {
  const auth = req.headers.get('authorization') ?? ''
  const key = auth.startsWith('Bearer ') ? auth.slice(7) : req.nextUrl.searchParams.get('api_key') ?? ''

  if (!key) {
    return { error: NextResponse.json({ success: false, error: 'Missing API key. Pass Authorization: Bearer <key>' }, { status: 401 }) }
  }

  const supabase = getServiceSupabase()
  const keyHash = createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, requests_count, is_active')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error || !data) {
    return { error: NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401 }) }
  }
  if (!data.is_active) {
    return { error: NextResponse.json({ success: false, error: 'API key is disabled' }, { status: 403 }) }
  }
  if (data.requests_count >= MONTHLY_RATE_LIMIT) {
    return { error: NextResponse.json({ success: false, error: 'Monthly rate limit exceeded' }, { status: 429 }) }
  }

  supabase
    .from('api_keys')
    .update({ requests_count: data.requests_count + 1, last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return {
    ctx: {
      keyId: data.id,
      userId: data.user_id,
      businessId: data.user_id,
      plan: 'paid',
      rateLimit: MONTHLY_RATE_LIMIT,
      requestsCount: data.requests_count + 1,
    }
  }
}

export function apiResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { status })
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message, timestamp: new Date().toISOString() }, { status })
}
