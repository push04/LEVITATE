import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireBusinessCompany } from '@/lib/business-intelligence-server'

async function getCompanyId(_supabase: ReturnType<typeof createServerClient>) {
  try {
    return (await requireBusinessCompany('whatsapp')).companyId
  } catch {
    return null
  }
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

  // Fetch most recent 500 messages (descending) so the window covers latest activity
  const { data: rawData, error } = await supabase
    .from('company_whatsapp_messages')
    .select('id, direction, from_number, to_number, message, is_ai_response, status, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Re-sort ascending for grouping (oldest-first within each thread)
  const data = (rawData || []).reverse() as Message[]

  // Group by contact phone number
  const threads = new Map<string, ConversationThread>()

  for (const msg of data) {
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
    // unread = inbound messages in the current window (UI can implement mark-as-read later)
    if (msg.direction === 'inbound') thread.unread++
  }

  // Sort threads by latest message
  const sorted = Array.from(threads.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  )

  return NextResponse.json({ conversations: sorted })
}
