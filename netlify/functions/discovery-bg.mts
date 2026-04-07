/**
 * Discovery Agent — Background Function
 * Triggered when a lead replies via email.
 * Qualifies budget, timeline, requirements via email conversation.
 * If qualified → triggers Proposal Agent.
 */

import { callAI } from '../../src/lib/ai/router'
import { sendLeadEmail, notifyFounder } from '../../src/lib/email/client'
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
You're having an email conversation with a potential client as Pushpal.

Your goal: Qualify this lead by finding out:
1. What kind of website/service they need
2. Their rough budget
3. Their timeline
4. Key business details

RULES:
- Sound like a friendly human (Pushpal from Levitate Labs)
- Ask ONE question at a time
- Keep emails short and clear (under 100 words)
- If budget seems clearly below Rs.2000, politely decline
- If they're ready → mention we can send a detailed proposal with pricing
- NEVER mention AI or automation
- Sign off: "Pushpal\nLevitate Labs\nlevitatelabs.online"

Return JSON ONLY (no markdown):
{
  "reply": "your email body here",
  "subject": "Re: [relevant subject]",
  "stage": "initial|qualifying|ready_for_proposal|disqualified",
  "qualified": null,
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
      subject: string
      stage: string
      qualified: boolean | null
      qualification_data: Record<string, string>
    }

    try {
      const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = {
        reply: response,
        subject: `Re: Website for ${lead.business_name}`,
        stage: 'qualifying',
        qualified: null,
        qualification_data: {}
      }
    }

    // Send email reply
    if (lead.email && parsed.reply) {
      await sendLeadEmail(
        lead.email,
        parsed.subject || `Re: Website for ${lead.business_name}`,
        parsed.reply
      )
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

      // Notify founder
      await notifyFounder(
        `🎯 Lead Qualified — ${lead.business_name}`,
        `${lead.business_name} (${lead.email}) is qualified!\n\nNeeds: ${parsed.qualification_data?.website_type}\nBudget: ${parsed.qualification_data?.budget_estimate}\nTimeline: ${parsed.qualification_data?.timeline}\n\nTriggering proposal now...`
      )

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

      if (lead.email) {
        await sendLeadEmail(
          lead.email,
          `Thank you for reaching out`,
          `Hi,\n\nThank you for your time! If you ever need web services in the future, we're here.\n\nBest of luck with ${lead.business_name}!\n\nPushpal\nLevitate Labs`
        )
      }
    }

    await supabase.from('leads').update(updateData).eq('id', lead.id)
    await supabase.from('messages').insert({
      lead_id: lead.id,
      direction: 'inbound',
      channel: 'email',
      content: incomingMessage,
      processed: true
    })

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
