/**
 * Razorpay Payment Webhook
 * Fires when payment is captured → starts entire delivery pipeline
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyRazorpaySignature } from '@/lib/payments/razorpay'
import { sendWhatsApp, sendWhatsAppToOwner } from '@/lib/whatsapp/client'
import { awardCredits, CREDIT_EVENTS } from '@/lib/agents/base-agent'

export async function POST(req: Request) {
  const supabase = getServiceSupabase()
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  // Verify webhook signature
  if (!verifyRazorpaySignature(body, signature)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body)

  try {
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const amountINR = payment.amount / 100
      const referenceId: string = payment.description ?? ''

      // Find the proposal this payment is for
      let proposal = null

      // Try by payment link reference
      if (referenceId.startsWith('lead_')) {
        const leadId = referenceId.replace('lead_', '')
        const { data } = await supabase.from('proposals').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).single()
        proposal = data
      }

      if (!proposal) {
        const { data } = await supabase.from('proposals').select('*').eq('payment_link_id', payment.payment_link_id ?? '').single()
        proposal = data
      }

      if (proposal) {
        // Mark proposal accepted
        await supabase.from('proposals').update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        }).eq('id', proposal.id)

        // Get the lead
        const { data: lead } = await supabase.from('leads').select('*').eq('id', proposal.lead_id).single()
        if (!lead) return new NextResponse('Lead not found', { status: 404 })

        // Update lead status
        await supabase.from('leads').update({ status: 'won' }).eq('id', lead.id)

        // Create client record
        const { data: client } = await supabase.from('clients').insert({
          lead_id: lead.id,
          business_name: lead.business_name,
          owner_name: lead.owner_name ?? '',
          phone: lead.phone ?? '',
          email: lead.email ?? '',
          whatsapp: lead.whatsapp ?? lead.phone ?? '',
          city: lead.city ?? '',
          business_type: lead.category,
          status: 'active'
        }).select().single()

        // Create project record
        const projectSlug = lead.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
        const { data: project } = await supabase.from('projects').insert({
          client_id: client?.id,
          lead_id: lead.id,
          name: proposal.title,
          slug: `${projectSlug}-${Date.now()}`,
          type: 'business_website',
          requirements: lead.requirements,
          status: 'advance_paid',
          quoted_price: proposal.total_price,
          advance_amount: amountINR,
          advance_paid_at: new Date().toISOString(),
          final_amount: proposal.final_amount,
          started_at: new Date().toISOString(),
          current_agent: 'onboarding'
        }).select().single()

        // Record revenue
        await supabase.from('revenue').insert({
          project_id: project?.id,
          client_id: client?.id,
          invoice_id: null,
          amount: amountINR,
          type: 'advance',
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          payment_method: payment.method,
          received_at: new Date().toISOString()
        })

        // Update client financials
        await supabase.from('clients').update({ total_paid: amountINR }).eq('id', client?.id)

        // Award credits
        await Promise.all([
          awardCredits('proposal', CREDIT_EVENTS.PROPOSAL_ACCEPTED, `Payment from ${lead.business_name}`),
          awardCredits('bizdev', Math.floor(CREDIT_EVENTS.ADVANCE_PAYMENT_RECEIVED * 0.3), 'Revenue share'),
          awardCredits('discovery', Math.floor(CREDIT_EVENTS.ADVANCE_PAYMENT_RECEIVED * 0.3), 'Revenue share')
        ])

        // Trigger onboarding background function
        if (project?.id) {
          fetch(`${process.env.URL ?? 'https://levitatelabs.online'}/.netlify/functions/onboarding-bg`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: project.id })
          }).catch(console.error)
        }

        // Notify Pushpal
        await sendWhatsAppToOwner(
          `💰 PAYMENT RECEIVED!\n${lead.business_name}\n₹${amountINR.toLocaleString('en-IN')} advance\n\nProject started! 🚀 Coding pipeline triggered.\nCheck /admin/dashboard/projects`
        )

        // Log it
        await supabase.from('agent_logs').insert({
          agent_name: 'webhook_handler',
          action: 'payment_captured',
          project_id: project?.id,
          lead_id: lead.id,
          input: { payment_id: payment.id, amount: amountINR },
          output: { client_id: client?.id, project_id: project?.id },
          status: 'success',
          credits_earned: CREDIT_EVENTS.ADVANCE_PAYMENT_RECEIVED
        })
      }

      return new NextResponse('OK', { status: 200 })
    }

    if (event.event === 'payment_link.paid') {
      // Alternative event format — forward to same handler
      console.log('[Razorpay] payment_link.paid:', event.payload)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('[Razorpay Webhook] Error:', err)
    return new NextResponse('Server error', { status: 500 })
  }
}

// Razorpay also fires GET for redirect after payment
export async function GET(req: Request) {
  const url = new URL(req.url)
  const status = url.searchParams.get('razorpay_payment_link_status')
  if (status === 'paid') {
    return NextResponse.redirect('https://levitatelabs.online/?payment=success')
  }
  return NextResponse.redirect('https://levitatelabs.online/?payment=cancelled')
}
