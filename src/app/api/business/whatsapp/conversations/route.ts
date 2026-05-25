import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getCompanyId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle()
  return data?.id ?? null
}

interface Message {
  id: string
  direction: string
  from_number: string | null
  to_number: string | null
  message: string
  is_ai_response: boolean
  status: string
  created_at: string
}

interface ConversationThread {
  contact: string
  messages: Message[]
  last_message: string
  last_at: string
  unread: number
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('company_whatsapp_messages')
    .select('id, direction, from_number, to_number, message, is_ai_response, status, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by contact phone number
  const threads = new Map<string, ConversationThread>()

  for (const msg of (data || []) as Message[]) {
    const contact = msg.direction === 'inbound'
      ? (msg.from_number || 'unknown')
      : (msg.to_number || 'unknown')

    if (!threads.has(contact)) {
      threads.set(contact, { contact, messages: [], last_message: '', last_at: '', unread: 0 })
    }

    const thread = threads.get(contact)!
    thread.messages.push(msg)
    thread.last_message = msg.message
    thread.last_at = msg.created_at
    if (msg.direction === 'inbound') thread.unread++
  }

  // Sort threads by latest message
  const sorted = Array.from(threads.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  )

  return NextResponse.json({ conversations: sorted })
}
