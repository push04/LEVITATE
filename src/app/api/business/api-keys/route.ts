import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type ApiKeyRow = {
  id: string
  key_prefix: string
  name: string
  created_at: string
  last_used_at: string | null
  requests_count: number
  is_active: boolean
}

export async function GET() {
  try {
    const context = await getBusinessApiContext()
    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, created_at, last_used_at, requests_count, is_active')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    const keys = (data as ApiKeyRow[]).map(k => ({
      id: k.id,
      prefix: k.key_prefix,
      name: k.name,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
      requestsThisMonth: k.requests_count,
      rateLimit: 1000,
      isActive: k.is_active,
    }))

    return NextResponse.json({ success: true, data: { keys } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message === 'Active subscription required') {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getBusinessApiContext()
    const supabase = getServiceSupabase()

    const body: unknown = await request.json().catch(() => ({}))
    const name =
      body && typeof body === 'object' && 'name' in body && typeof (body as Record<string, unknown>).name === 'string'
        ? (body as Record<string, unknown>).name as string
        : 'Default Key'

    const { data: existingKeys } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', context.userId)
      .eq('is_active', true)

    if (existingKeys && existingKeys.length >= 5) {
      return NextResponse.json({ error: 'Maximum of 5 active API keys allowed' }, { status: 400 })
    }

    const rawKey = 'lv_live_' + randomBytes(16).toString('hex')
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 16) + '...'

    const { data: inserted, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: context.userId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
      })
      .select('id, key_prefix, name, created_at')
      .single()

    if (insertError || !inserted) {
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (inserted as ApiKeyRow).id,
        key: rawKey,
        prefix: (inserted as ApiKeyRow).key_prefix,
        name: (inserted as ApiKeyRow).name,
        createdAt: (inserted as ApiKeyRow).created_at,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message === 'Active subscription required') {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
