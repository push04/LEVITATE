import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { callAI } from '@/lib/ai/router'

const DAEMON_SECRET = process.env.DAEMON_SECRET || 'levitate-daemon-secret'
const ESCALATION_RESPONSE = 'I am connecting you with our team. Someone will be in touch shortly.'

export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { company_id, from, body: messageBody, secret } = body

  if (secret !== DAEMON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!from || !messageBody) {
    return NextResponse.json({ error: 'Missing from or body' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Store inbound message
  await supabase.from('company_whatsapp_messages').insert({
    company_id: company_id || null,
    direction: 'inbound',
    from_number: from,
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
    // Send escalation response
    await supabase.from('whatsapp_queue').insert({
      to_number: from,
      message: ESCALATION_RESPONSE,
      status: 'pending',
      company_id,
      contact_name: null,
    })
    await supabase.from('company_whatsapp_messages').insert({
      company_id,
      direction: 'outbound',
      to_number: from,
      from_number: null,
      message: ESCALATION_RESPONSE,
      status: 'pending',
      is_ai_response: true,
    })

    // Notify escalation email if configured
    if (config.ai_agent_escalation_email) {
      // Email notification handled via existing email system if available
      // For now just log it
      console.log(`[Inbound] Escalation triggered for ${from}, notify: ${config.ai_agent_escalation_email}`)
    }

    return NextResponse.json({ ok: true, ai: true, escalated: true })
  }

  // Load conversation history (last 10 messages)
  const { data: history } = await supabase
    .from('company_whatsapp_messages')
    .select('direction, message, created_at')
    .eq('company_id', company_id)
    .or(`from_number.eq.${from},to_number.eq.${from}`)
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

  // Queue outbound AI reply
  await supabase.from('whatsapp_queue').insert({
    to_number: from,
    message: aiReply,
    status: 'pending',
    company_id,
    contact_name: null,
  })

  // Mirror AI response to conversation history
  await supabase.from('company_whatsapp_messages').insert({
    company_id,
    direction: 'outbound',
    to_number: from,
    from_number: null,
    message: aiReply,
    status: 'pending',
    is_ai_response: true,
  })

  return NextResponse.json({ ok: true, ai: true, escalated: false })
}
