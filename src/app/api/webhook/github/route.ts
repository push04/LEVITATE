/**
 * GitHub Actions Callback Webhook
 * GitHub posts status updates here after each pipeline step.
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { sendWhatsAppToOwner } from '@/lib/whatsapp/client'
import { awardCredits, CREDIT_EVENTS } from '@/lib/agents/base-agent'
import crypto from 'crypto'

function verifyGitHubSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET

  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)

  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const supabase = getServiceSupabase()

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')

    if (!verifyGitHubSignature(rawBody, signature)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = JSON.parse(rawBody) as {
      event: string
      project_id?: string
      agent?: string
      status?: string
      staging_url?: string
      error?: string
      metadata?: Record<string, unknown>
    }

    const { event, project_id, agent, status, staging_url, error, metadata } = body

    await supabase.from('agent_logs').insert({
      agent_name: agent ?? 'github_action',
      action: event,
      project_id: project_id ?? null,
      input: { event, metadata },
      output: { status, staging_url, error },
      status: status === 'success' ? 'success' : 'failure',
      credits_earned: 0
    })

    // Handle specific events
    if (event === 'coding_complete' && status === 'success' && project_id) {
      await supabase.from('projects').update({
        status: 'staging',
        staging_url: staging_url ?? null,
        current_agent: 'client_update'
      }).eq('id', project_id)

      // Get project + client info
      const { data: project } = await supabase
        .from('projects')
        .select('*, clients(*)')
        .eq('id', project_id)
        .single()

      if (project?.clients?.whatsapp && staging_url) {
        const clientMsg = `Hi ${project.clients.owner_name},

Your website is ready for review.

Preview: ${staging_url}

Reply "APPROVED" if everything looks good.
If you'd like changes, reply with the list of updates.

We will turn changes around within 24 hours.`

        await sendWhatsAppToOwner(
          `Website ready\n${project.clients.business_name}\nStaging: ${staging_url}\n\nClient notified for review.`
        )

        const { sendWhatsApp } = await import('@/lib/whatsapp/client')
        await sendWhatsApp(project.clients.whatsapp, clientMsg)
        await awardCredits('coder', CREDIT_EVENTS.FEATURE_CODED_CLEANLY, 'Website coding complete')
      }
    }

    if (event === 'coding_failed' && project_id) {
      await supabase.from('projects').update({
        status: 'debugging',
        current_agent: 'debugger'
      }).eq('id', project_id)

      await sendWhatsAppToOwner(`Coding failed\nProject: ${project_id}\nError: ${error}\n\nDebugger triggered automatically.`)
      await awardCredits('coder', CREDIT_EVENTS.TASK_FAILED, 'Coding pipeline failed')
    }

    if (event === 'project_delivered' && project_id) {
      await supabase.from('projects').update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        current_agent: 'invoice'
      }).eq('id', project_id)

      await awardCredits('deployer', CREDIT_EVENTS.PROJECT_DELIVERED, 'Project delivered')

      // Create final invoice
      const { data: project } = await supabase
        .from('projects')
        .select('*, clients(*)')
        .eq('id', project_id)
        .single()

      if (project) {
        const invoiceNumber = `LL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
        const finalAmount = project.final_amount ?? 0
        const gstAmount = finalAmount * 0.18

        await supabase.from('invoices').insert({
          invoice_number: invoiceNumber,
          project_id,
          client_id: project.client_id,
          type: 'final',
          subtotal: finalAmount,
          gst_rate: 18,
          gst_amount: gstAmount,
          total: finalAmount + gstAmount,
          status: 'sent',
          due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
          sent_at: new Date().toISOString()
        })
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('[GitHub Webhook] Error:', err)
    return new NextResponse('Error', { status: 500 })
  }
}
