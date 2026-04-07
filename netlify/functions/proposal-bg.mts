/**
 * Proposal Agent — Background Function
 * Triggered after a lead is qualified.
 * Generates PDF proposal + Razorpay payment link → sends via WhatsApp.
 */

import { callAI } from '../../src/lib/ai/router'
import { sendWhatsApp } from '../../src/lib/whatsapp/client'
import { createPaymentLink } from '../../src/lib/payments/razorpay'
import { generateProposalPDF } from '../../src/lib/pdf/proposal'
import { getServiceSupabase } from '../../src/lib/supabase'
import { awardCredits, CREDIT_EVENTS } from '../../src/lib/agents/base-agent'

export default async (req: Request) => {
  const supabase = getServiceSupabase()

  try {
    const { leadId, qualificationData } = await req.json() as {
      leadId: string
      qualificationData: Record<string, string>
    }

    const [{ data: lead }, rateCardRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('system_config').select('value').eq('key', 'rate_card').single()
    ])

    if (!lead) return new Response('Lead not found', { status: 404 })

    const rateCard = rateCardRes.data?.value ?? {
      landing_page: { min: 3000, max: 6000, days: 3 },
      business_website: { min: 6000, max: 15000, days: 7 }
    }

    // AI generates the proposal content
    const proposalJSON = await callAI(
      `Create a professional website proposal for this client.
Return ONLY valid JSON (no markdown) matching this exact structure:
{
  "title": "Project title",
  "website_type": "landing_page|business_website|ecommerce|webapp",
  "scope": "2-3 sentence description of what we'll build",
  "deliverables": ["deliverable 1", "deliverable 2", "...up to 8 items"],
  "timeline_days": 7,
  "total_price": 8000,
  "advance_amount": 4000,
  "final_amount": 4000,
  "why_they_need_this": "Specific 2-3 sentence explanation for THIS business",
  "our_process": ["Step 1: Discovery & Design", "Step 2: Development", "Step 3: Testing & Launch", "Step 4: Handover & Training"]
}

Rules:
- Price based on rate card and their needs (lean toward lower end for small local businesses)
- advance_amount = total_price / 2
- final_amount = total_price - advance_amount
- deliverables must be specific to their business type
- timeline_days must match the rate card for their website_type`,
      JSON.stringify({ client: lead.business_name, qualification: qualificationData, rate_card: rateCard }),
      800,
      'proposal'
    )

    let proposal: {
      title: string; website_type: string; scope: string; deliverables: string[]
      timeline_days: number; total_price: number; advance_amount: number; final_amount: number
      why_they_need_this: string; our_process: string[]
    }

    try {
      const clean = proposalJSON.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      proposal = JSON.parse(clean)
    } catch {
      // Fallback defaults
      proposal = {
        title: `Professional Website for ${lead.business_name}`,
        website_type: 'business_website',
        scope: `A fully functional, mobile-responsive website for ${lead.business_name}.`,
        deliverables: ['Home page', 'About page', 'Services page', 'Contact form', 'WhatsApp chat button', 'Google Maps integration', 'Mobile responsive design', 'Basic SEO setup'],
        timeline_days: 7,
        total_price: 8000,
        advance_amount: 4000,
        final_amount: 4000,
        why_they_need_this: `${lead.business_name} needs a professional online presence to attract customers who search online.`,
        our_process: ['Day 1-2: Design mockup', 'Day 3-5: Development', 'Day 6: Testing', 'Day 7: Launch']
      }
    }

    // Create Razorpay payment link for advance
    let paymentLink: { id: string; short_url: string } | null = null
    try {
      paymentLink = await createPaymentLink({
        amount: proposal.advance_amount,
        description: `Advance for ${proposal.title}`,
        name: lead.owner_name ?? lead.business_name,
        contact: lead.whatsapp ?? lead.phone ?? '',
        referenceId: `lead_${leadId}`
      })
    } catch (err) {
      console.error('[Proposal] Razorpay link creation failed:', err)
    }

    // Generate PDF
    let pdfUrl = ''
    try {
      const pdfBuffer = await generateProposalPDF({
        ...proposal,
        client_name: lead.owner_name ?? 'Business Owner',
        business_name: lead.business_name,
        payment_link: paymentLink?.short_url
      })

      const { data: uploadData } = await supabase.storage
        .from('documents')
        .upload(`proposals/${leadId}-${Date.now()}.pdf`, pdfBuffer, { contentType: 'application/pdf' })

      if (uploadData) {
        const { data: publicData } = supabase.storage.from('documents').getPublicUrl(uploadData.path)
        pdfUrl = publicData.publicUrl
      }
    } catch (err) {
      console.error('[Proposal] PDF generation failed:', err)
    }

    // Save proposal to DB
    const expiryDate = new Date(Date.now() + 7 * 86400000).toISOString()
    const { data: savedProposal } = await supabase.from('proposals').insert({
      lead_id: leadId,
      title: proposal.title,
      scope: proposal.scope,
      deliverables: proposal.deliverables,
      timeline_days: proposal.timeline_days,
      total_price: proposal.total_price,
      advance_amount: proposal.advance_amount,
      final_amount: proposal.final_amount,
      pdf_url: pdfUrl,
      payment_link: paymentLink?.short_url,
      payment_link_id: paymentLink?.id,
      status: 'draft',
      expiry_date: expiryDate
    }).select().single()

    // Send via WhatsApp
    const ownerName = lead.owner_name ?? 'there'
    const whatsappMessage = `Hi ${ownerName}! 🎉

Here's your custom proposal for ${lead.business_name}:

📋 *${proposal.title}*
🗓️ Timeline: ${proposal.timeline_days} working days
💰 Total: ₹${proposal.total_price.toLocaleString('en-IN')}

${pdfUrl ? `📄 Full proposal: ${pdfUrl}\n\n` : ''}To get started, pay ₹${proposal.advance_amount.toLocaleString('en-IN')} advance:
${paymentLink?.short_url ? `💳 ${paymentLink.short_url}` : 'Payment link will be shared shortly.'}

Questions? Just reply here! 🙏`

    if (lead.whatsapp) {
      await sendWhatsApp(lead.whatsapp, whatsappMessage)
    }

    // Update statuses
    await Promise.all([
      supabase.from('proposals').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', savedProposal?.id),
      supabase.from('leads').update({ status: 'proposal_sent' }).eq('id', leadId),
      awardCredits('proposal', CREDIT_EVENTS.PROPOSAL_SENT, `Proposal sent to ${lead.business_name}`)
    ])

    await supabase.from('agent_logs').insert({
      agent_name: 'proposal',
      action: 'generate_and_send',
      lead_id: leadId,
      input: { qualification: qualificationData },
      output: { proposal_id: savedProposal?.id, amount: proposal.total_price, pdf_url: pdfUrl },
      status: 'success',
      credits_earned: CREDIT_EVENTS.PROPOSAL_SENT
    })

    return new Response(JSON.stringify({ success: true, proposalId: savedProposal?.id }), { status: 200 })
  } catch (err) {
    console.error('[Proposal] Failed:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
