import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { callAI } from '@/lib/ai/router'

const ESCALATION_RESPONSE = 'I am connecting you with our team. Someone will be in touch shortly.'
const PHONE_RE = /^\d{10,15}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const DAEMON_SECRET = process.env.DAEMON_SECRET
  if (!DAEMON_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Auth via header only — never accept secret in JSON body (avoids logging exposure)
  if (req.headers.get('x-daemon-secret') !== DAEMON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { company_id, from, body: messageBody } = body

  if (!from || !messageBody) {
    return NextResponse.json({ error: 'Missing from or body' }, { status: 400 })
  }

  // Validate phone number format to prevent filter injection in .or() query
  const cleanFrom = from.replace(/[^0-9]/g, '')
  if (!PHONE_RE.test(cleanFrom)) {
    return NextResponse.json({ error: 'Invalid from number' }, { status: 400 })
  }

  // Validate company_id is a real UUID if provided (prevents phantom row creation)
  if (company_id && !UUID_RE.test(company_id)) {
    return NextResponse.json({ error: 'Invalid company_id' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Verify company exists before attributing messages to it
  if (company_id) {
    const { data: co } = await supabase.from('companies').select('id').eq('id', company_id).maybeSingle()
    if (!co) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }
  }

  // Store inbound message
  await supabase.from('company_whatsapp_messages').insert({
    company_id: company_id || null,
    direction: 'inbound',
    from_number: cleanFrom,
    to_number: null,
    message: messageBody,
    status: 'delivered',
    is_ai_response: false,
  })

  // Skip AI processing for admin (no company_id)
  if (!company_id) {
    return NextResponse.json({ ok: true, ai: false })
  }

  // Load AI config
  const { data: config } = await supabase
    .from('company_whatsapp_config')
    .select('ai_agent_enabled, ai_agent_name, ai_agent_tone, ai_agent_system_prompt, ai_agent_faq, ai_agent_escalation_keywords, ai_agent_escalation_email')
    .eq('company_id', company_id)
    .single()

  if (!config?.ai_agent_enabled) {
    return NextResponse.json({ ok: true, ai: false })
  }

  // Check escalation keywords
  const keywords: string[] = config.ai_agent_escalation_keywords || []
  const lowerMsg = messageBody.toLowerCase()
  const isEscalation = keywords.some((k: string) => lowerMsg.includes(k.toLowerCase()))

  if (isEscalation) {
    await supabase.from('whatsapp_queue').insert({
      to_number: cleanFrom,
      message: ESCALATION_RESPONSE,
      status: 'pending',
      company_id,
      contact_name: null,
    })
    await supabase.from('company_whatsapp_messages').insert({
      company_id,
      direction: 'outbound',
      to_number: cleanFrom,
      from_number: null,
      message: ESCALATION_RESPONSE,
      status: 'pending',
      is_ai_response: true,
    })

    if (config.ai_agent_escalation_email) {
      console.log(`[Inbound] Escalation triggered for ${cleanFrom}, notify: ${config.ai_agent_escalation_email}`)
    }

    return NextResponse.json({ ok: true, ai: true, escalated: true, reply: ESCALATION_RESPONSE })
  }

  // Load conversation history (last 10 messages) — use cleanFrom for filter safety
  const { data: history } = await supabase
    .from('company_whatsapp_messages')
    .select('direction, message, created_at')
    .eq('company_id', company_id)
    .or(`from_number.eq.${cleanFrom},to_number.eq.${cleanFrom}`)
    .order('created_at', { ascending: false })
    .limit(10)

  const historyText = (history || [])
    .reverse()
    .map((m: { direction: string; message: string }) =>
      `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.message}`
    )
    .join('\n')

  // Build FAQ context
  const faqItems: Array<{ q: string; a: string }> = config.ai_agent_faq || []
  const faqContext = faqItems.length
    ? `\nFAQ:\n${faqItems.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n')}`
    : ''

  const toneLine = config.ai_agent_tone === 'friendly'
    ? 'Use a warm, friendly tone.'
    : config.ai_agent_tone === 'casual'
    ? 'Use a casual, conversational tone.'
    : 'Use a professional tone.'

  const systemPrompt = [
    `You are ${config.ai_agent_name || 'Assistant'}, a WhatsApp support agent.`,
    toneLine,
    config.ai_agent_system_prompt || '',
    faqContext,
    'Keep replies concise (under 150 words). Do not use markdown. Reply only with the message text.',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt = historyText
    ? `Conversation so far:\n${historyText}\n\nCustomer's latest message: ${messageBody}`
    : `Customer: ${messageBody}`

  let aiReply: string
  try {
    aiReply = await callAI(systemPrompt, userPrompt, 300, 'whatsapp-agent')
    aiReply = aiReply.trim()
  } catch (err) {
    console.error('[Inbound] Groq AI failed:', err)
    return NextResponse.json({ ok: true, ai: false, error: 'AI unavailable' })
  }

  await supabase.from('whatsapp_queue').insert({
    to_number: cleanFrom,
    message: aiReply,
    status: 'pending',
    company_id,
    contact_name: null,
  })

  await supabase.from('company_whatsapp_messages').insert({
    company_id,
    direction: 'outbound',
    to_number: cleanFrom,
    from_number: null,
    message: aiReply,
    status: 'pending',
    is_ai_response: true,
  })

  return NextResponse.json({ ok: true, ai: true, escalated: false, reply: aiReply })
}
