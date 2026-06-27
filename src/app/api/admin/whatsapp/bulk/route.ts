import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(1)
  return digits
}

function personalize(template: string, name: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key.toLowerCase() === 'name') return name || `{{${key}}}`
    return `{{${key}}}`
  })
}

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { contacts: Array<{ phone: string; name?: string }>; message: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { contacts, message } = body

  if (!Array.isArray(contacts) || !contacts.length) {
    return NextResponse.json({ error: 'contacts array required' }, { status: 400 })
  }
  if (contacts.length > 10_000) {
    return NextResponse.json({ error: 'Max 10,000 contacts per request' }, { status: 400 })
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }
  if (message.length > 4096) {
    return NextResponse.json({ error: 'Message too long (max 4096 chars)' }, { status: 400 })
  }

  const validRows: { to_number: string; contact_name: string | null; message: string; status: string; company_id: null }[] = []
  let skipped = 0

  for (const c of contacts) {
    const phone = normalizePhone(c.phone ?? '')
    if (phone.length >= 10 && phone.length <= 15) {
      validRows.push({
        to_number: phone,
        contact_name: c.name?.trim() || null,
        message: personalize(message.trim(), c.name?.trim() ?? ''),
        status: 'pending',
        company_id: null,
      })
    } else {
      skipped++
    }
  }

  if (!validRows.length) {
    return NextResponse.json({ error: 'No valid phone numbers found after normalization', skipped }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const BATCH = 100
  let queued = 0

  for (let i = 0; i < validRows.length; i += BATCH) {
    const batch = validRows.slice(i, i + BATCH)
    const { data, error } = await supabase.from('whatsapp_queue').insert(batch).select('id')
    if (error) {
      console.error('[whatsapp/bulk] insert error:', error.message)
      skipped += batch.length
    } else {
      queued += data?.length ?? batch.length
    }
  }

  return NextResponse.json({ success: true, queued, skipped, total: contacts.length })
}
