/**
 * Discovery Agent — Background Function
 * Triggered when a lead replies on WhatsApp.
 * Qualifies budget, timeline, requirements via conversation.
 * If qualified → triggers Proposal Agent.
 */

import { callAI } from '../../src/lib/ai/router'
import { sendWhatsApp } from '../../src/lib/whatsapp/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { awardCredits, CREDIT_EVENTS } from '../../src/lib/agents/base-agent'

export default async (req: Request) => {
  const supabase = getServiceSupabase()

  try {
    const { leadId, incomingMessage } = await req.json() as { leadId: string; incomingMessage: string }

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
    if (!lead) return new Response('Lead not found', { status: 404 })

    const history = (lead.conversation_history ?? []) as Array<{ role: string; message: string; timestamp: string }>
    history.push({ role: 'client', message: incomingMessage, timestamp: new Date().toISOString() })

    const stage = history.length <= 2 ? 'initial' : history.length <= 6 ? 'qualifying' : 'closing'

    const response = await callAI(
      `You are a discovery agent for Levitate Labs web agency.
You're having a WhatsApp conversation with a potential client as Pushpal.

Your goal: Qualify this lead by finding out:
1. What kind of website/service they need
2. Their rough budget (don't ask directly — gauge from context)
3. Their timeline (when do they need it?)
4. Key business details

RULES:
- Sound like a friendly human (Pushpal from Levitate Labs)
- Ask ONE question at a time
- Use Hinglish naturally
- Short messages only (under 100 words)
- If budget seems clearly <₹2000, politely decline
- If they're ready → mention we can send a proposal with pricing
- NEVER mention AI or automation

Return JSON ONLY (no markdown):
{
  "reply": "your reply here",
  "stage": "initial|qualifying|ready_for_proposal|disqualified",
  "qualified": null|true|false,
  "qualification_data": {
    "website_type": "",
    "budget_estimate": "",
    "timeline": "",
    "key_requirements": "",
    "disqualify_reason": ""
  }
}`,
      JSON.stringify({
        stage,
        business_name: lead.business_name,
        category: lead.category,
        city: lead.city,
        conversation: history.slice(-8),
        incoming: incomingMessage
      }),
      600,
      'discovery'
    )

    let parsed: {
      reply: string
      stage: string
      qualified: boolean | null
      qualification_data: Record<string, string>
    }

    try {
      const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { reply: response, stage: 'qualifying', qualified: null, qualification_data: {} }
    }

    // Send reply
    if (lead.whatsapp && parsed.reply) {
      await sendWhatsApp(lead.whatsapp, parsed.reply)
      history.push({ role: 'agent', message: parsed.reply, timestamp: new Date().toISOString() })
    }

    // Update lead record
    const updateData: Record<string, unknown> = {
      conversation_history: history,
      last_message_at: new Date().toISOString(),
      first_reply_at: lead.first_reply_at ?? new Date().toISOString(),
      status: lead.status === 'contacted' ? 'replied' : lead.status
    }

    if (parsed.qualified === true) {
      updateData.qualified = true
      updateData.status = 'qualified'
      updateData.requirements = parsed.qualification_data?.key_requirements
      updateData.budget_range = parsed.qualification_data?.budget_estimate
      updateData.timeline = parsed.qualification_data?.timeline
      await awardCredits('discovery', CREDIT_EVENTS.LEAD_QUALIFIED, `Qualified: ${lead.business_name}`)

      // Trigger Proposal Agent
      const res = await fetch(`${process.env.URL ?? 'https://levitatelabs.online'}/.netlify/functions/proposal-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, qualificationData: parsed.qualification_data })
      })
      console.log('[Discovery] Triggered proposal-bg:', res.status)
    } else if (parsed.qualified === false) {
      updateData.qualified = false
      updateData.status = 'lost'
      updateData.disqualify_reason = parsed.qualification_data?.disqualify_reason ?? 'Disqualified in discovery'

      await sendWhatsApp(lead.whatsapp!, `Thank you for your time! 🙏 If you ever need web services in the future, we're here. Best of luck with ${lead.business_name}! 🚀`)
    }

    await supabase.from('leads').update(updateData).eq('id', lead.id)
    await supabase.from('messages').insert({ lead_id: lead.id, direction: 'inbound', channel: 'whatsapp', content: incomingMessage, processed: true })

    await supabase.from('agent_logs').insert({
      agent_name: 'discovery',
      action: 'handle_reply',
      lead_id: lead.id,
      input: { message: incomingMessage },
      output: { reply: parsed.reply, qualified: parsed.qualified },
      status: 'success',
      credits_earned: parsed.qualified ? CREDIT_EVENTS.LEAD_QUALIFIED : 2
    })

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[Discovery] Failed:', err)
    return new Response('Error', { status: 500 })
  }
}
