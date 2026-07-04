/**
 * Razorpay Payment Webhook
 * Fires when payment is captured -> starts entire delivery pipeline
 */

import { NextResponse } from 'next/server'
import { upsertBusinessProfile } from '@/lib/business-auth'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyRazorpaySignature } from '@/lib/payments/razorpay'
import { sendWhatsAppToOwner } from '@/lib/whatsapp/client'
import { awardCredits, CREDIT_EVENTS } from '@/lib/agents/base-agent'
import { sendOnboardingConfirmationEmail } from '@/lib/onboarding-confirmation'
import { finalizeOnboardingCouponRedemption } from '@/lib/onboarding-coupons'

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

      // Marketplace listing purchases (Amazon/Flipkart/Meesho) — paid via a
      // dedicated Razorpay Payment Link, matched by that link's id.
      if (payment.payment_link_id) {
        const { data: marketplaceRequest } = await supabase
          .from('marketplace_requests')
          .select('id, payment_status')
          .eq('razorpay_payment_link_id', payment.payment_link_id)
          .maybeSingle()

        if (marketplaceRequest) {
          if (marketplaceRequest.payment_status !== 'paid') {
            const { error: mpUpdateError } = await supabase
              .from('marketplace_requests')
              .update({ payment_status: 'paid', razorpay_payment_id: payment.id, updated_at: new Date().toISOString() })
              .eq('id', marketplaceRequest.id)
            if (mpUpdateError) {
              console.error('[Razorpay Webhook] Failed to mark marketplace request paid:', mpUpdateError.message)
            } else {
              await sendWhatsAppToOwner(
                `MARKETPLACE LISTING PAID\n₹${amountINR.toLocaleString('en-IN')}\nRequest ${marketplaceRequest.id}\nCheck /admin/dashboard/marketplace`
              )
            }
          }
          return new NextResponse('OK', { status: 200 })
        }
      }

      // Find the proposal this payment is for
      let proposal = null

      // Try by payment link reference
      if (referenceId.startsWith('lead_')) {
        const leadId = referenceId.replace('lead_', '')
        const { data } = await supabase.from('proposals').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        proposal = data
      }

      if (!proposal) {
        const { data } = await supabase.from('proposals').select('*').eq('payment_link_id', payment.payment_link_id ?? '').maybeSingle()
        proposal = data
      }

      if (proposal) {
        // Idempotency: Razorpay can redeliver the same event; a payment_id already
        // recorded in revenue means this webhook call was already fully processed.
        const { data: existingRevenue } = await supabase
          .from('revenue')
          .select('id')
          .eq('razorpay_payment_id', payment.id)
          .maybeSingle()

        if (existingRevenue) {
          return new NextResponse('OK (already processed)', { status: 200 })
        }

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

        // Record revenue (only real columns on this table — client_id/invoice_id/
        // razorpay_order_id/payment_method don't exist and previously made this
        // insert fail silently on every payment)
        const { error: revenueError } = await supabase.from('revenue').insert({
          project_id: project?.id,
          lead_id: lead.id,
          client_name: lead.business_name,
          amount: amountINR,
          type: 'advance',
          razorpay_payment_id: payment.id,
          received_at: new Date().toISOString()
        })
        if (revenueError) {
          console.error('[Razorpay Webhook] Failed to record revenue:', revenueError.message)
        }

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
          `PAYMENT RECEIVED\n${lead.business_name}\n₹${amountINR.toLocaleString('en-IN')} advance\n\nProject started. Coding pipeline triggered.\nCheck /admin/dashboard/projects`
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

    if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
      const subscription = event.payload?.subscription?.entity ?? event.payload?.subscription ?? null

      if (subscription?.id) {
        const { data: signup } = await supabase
          .from('onboarding_subscriptions')
          .select('*')
          .eq('razorpay_subscription_id', subscription.id)
          .maybeSingle()

        if (signup) {
          const notes = (signup.notes && typeof signup.notes === 'object' ? signup.notes : {}) as Record<string, unknown>
          const planName = typeof notes.plan_name === 'string' ? notes.plan_name : 'Onboarding Plan'
          const userId = typeof notes.user_id === 'string' ? notes.user_id : null
          const workspaceUrl =
            (typeof signup.workspace_backlink_url === 'string' && signup.workspace_backlink_url) ||
            (typeof notes.backlink_url === 'string' && notes.backlink_url) ||
            (typeof notes.workspace_url === 'string' && notes.workspace_url) ||
            signup.subdomain_url

          // Atomic claim: only rows where confirmation_sent isn't already true get
          // updated here, so concurrent/duplicate webhook deliveries can't both
          // decide to send the confirmation email.
          const { data: claimedRows, error: claimError } = await supabase
            .from('onboarding_subscriptions')
            .update({
              status: 'active',
              notes: {
                ...notes,
                subscription_status: subscription.status ?? 'active',
                confirmation_sent: true,
                confirmed_at: new Date().toISOString()
              }
            })
            .eq('id', signup.id)
            .or('notes->>confirmation_sent.is.null,notes->>confirmation_sent.neq.true')
            .select('*')

          if (claimError) {
            throw new Error(claimError.message)
          }

          const shouldSendEmail = Boolean(claimedRows && claimedRows.length > 0)

          let updatedSignup = claimedRows?.[0]
          if (!updatedSignup) {
            // Already claimed by a concurrent delivery — just re-read current state
            // so status stays consistent for the coupon finalization step below.
            const { data: current, error: currentError } = await supabase
              .from('onboarding_subscriptions')
              .select('*')
              .eq('id', signup.id)
              .single()

            if (currentError || !current) {
              throw new Error(currentError?.message ?? 'Unable to load onboarding subscription')
            }
            updatedSignup = current
          }

          // onboarding_subscriptions has no coupon_id/user_id/company_id/discount_amount/
          // final_amount columns — that data only ever lives in notes (see
          // src/app/api/onboard/checkout/route.ts), so build the redemption
          // input from there rather than the row's (nonexistent) direct fields.
          const updatedNotes = (updatedSignup.notes && typeof updatedSignup.notes === 'object' ? updatedSignup.notes : {}) as Record<string, unknown>
          await finalizeOnboardingCouponRedemption({
            id: updatedSignup.id,
            coupon_id: typeof updatedNotes.coupon_id === 'string' ? updatedNotes.coupon_id : null,
            coupon_code: typeof updatedNotes.coupon_code === 'string' ? updatedNotes.coupon_code : null,
            user_id: typeof updatedNotes.user_id === 'string' ? updatedNotes.user_id : null,
            company_id: typeof updatedNotes.company_id === 'string' ? updatedNotes.company_id : null,
            amount: updatedSignup.amount,
            discount_amount: typeof updatedNotes.discount_amount === 'number' ? updatedNotes.discount_amount : null,
            final_amount: typeof updatedNotes.final_amount === 'number' ? updatedNotes.final_amount : updatedSignup.amount,
          })

          // Per-charge ledger for reconciliation against Razorpay. Table is created by
          // supabase/migrations/20260704_01_onboarding_transactions.sql — insert is
          // best-effort so a missing/not-yet-applied migration never blocks activation.
          //
          // Idempotency: `subscription.charged` events always carry a real payment
          // entity, so the table's UNIQUE(razorpay_payment_id) constraint naturally
          // dedupes retried deliveries. `subscription.activated` has no payment
          // entity (razorpay_payment_id is NULL, which the unique constraint does
          // NOT dedupe), so — since activation should only ever log once per
          // subscription — explicitly check for an existing activation row first
          // rather than gating on `shouldSendEmail` (which would also suppress
          // every later month's legitimate `subscription.charged` ledger row, since
          // confirmation_sent stays true after the first activation).
          const chargePayment = event.payload?.payment?.entity ?? null
          let shouldLogLedger = true
          if (!chargePayment) {
            const { data: existingActivation } = await supabase
              .from('onboarding_transactions')
              .select('id')
              .eq('subscription_id', signup.id)
              .eq('event_type', event.event)
              .maybeSingle()
            shouldLogLedger = !existingActivation
          }

          if (shouldLogLedger) {
            const { error: ledgerError } = await supabase.from('onboarding_transactions').insert({
              subscription_id: signup.id,
              company_id: typeof notes.company_id === 'string' ? notes.company_id : null,
              razorpay_subscription_id: subscription.id,
              razorpay_payment_id: chargePayment?.id ?? null,
              event_type: event.event,
              amount: chargePayment ? chargePayment.amount / 100 : Number(updatedSignup.final_amount ?? updatedSignup.amount ?? signup.amount),
              status: chargePayment?.status ?? 'captured'
            })
            if (ledgerError) {
              console.error('[Razorpay Webhook] Failed to record transaction ledger entry:', ledgerError.message)
            }
          }

          if (userId) {
            const profileResult = await upsertBusinessProfile(supabase, {
              userId,
              email: signup.email,
              fullName: signup.owner_name,
              status: 'active',
            })

            if (!profileResult.success) {
              throw new Error(`Unable to grant business access for ${signup.email}: ${profileResult.error.message}`)
            }
          }

          if (shouldSendEmail) {
            await sendOnboardingConfirmationEmail({
              to: signup.email,
              ownerName: signup.owner_name,
              companyName: signup.company_name,
              planName,
              billingCycle: signup.billing_cycle,
              amount: Number(updatedSignup.final_amount ?? updatedSignup.amount ?? signup.amount),
              dashboardUrl: '/business/dashboard?onboard=success',
              workspaceUrl
            })
          }
        }
      }
    }

    if (event.event === 'payment_link.paid') {
      // Informational only — Razorpay always also fires payment.captured for the
      // same payment, which is what actually processes proposal/marketplace
      // payments above. This branch just logs for visibility, it does not
      // duplicate that processing.
      console.log('[Razorpay] payment_link.paid:', event.payload)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err: unknown) {
    console.error('[Razorpay Webhook] Error:', err)
    return new NextResponse('Server error', { status: 500 })
  }
}

// Razorpay also fires GET for redirect after payment
export async function GET(req: Request) {
  const url = new URL(req.url)
  const status = url.searchParams.get('razorpay_payment_link_status')
  if (status === 'paid') {
    return NextResponse.redirect('https://levitatelabs.online/business/dashboard?onboard=success')
  }
  return NextResponse.redirect('https://levitatelabs.online/?payment=cancelled')
}

