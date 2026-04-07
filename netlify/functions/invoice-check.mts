/**
 * Invoice Chase Agent — Daily 9 AM IST
 * Automatically follows up on unpaid invoices via email.
 * Day 3: friendly reminder | Day 7: firm | Day 14: final | Day 21+: escalate to Pushpal
 * Schedule: 3:30 AM UTC = 9:00 AM IST
 */

import type { Config } from '@netlify/functions'
import { sendEmail, notifyFounder } from '../../src/lib/email/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { awardCredits, CREDIT_EVENTS } from '../../src/lib/agents/base-agent'

export default async () => {
  const supabase = getServiceSupabase()

  try {
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('*, clients(*), projects(*)')
      .eq('status', 'sent')
      .lt('due_date', new Date().toISOString())

    let chased = 0

    for (const invoice of overdueInvoices ?? []) {
      const daysPast = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000)
      const clientName = invoice.clients?.owner_name ?? 'there'
      const businessName = invoice.clients?.business_name ?? ''
      const link = invoice.razorpay_payment_link
      const amount = `₹${Number(invoice.total).toLocaleString('en-IN')}`
      const invNum = invoice.invoice_number
      const clientEmail = invoice.clients?.email

      let subject = ''
      let message = ''

      if (daysPast >= 3 && daysPast < 7 && invoice.reminder_count === 0) {
        subject = `Friendly reminder — Invoice #${invNum} from Levitate Labs`
        message = `Hi ${clientName},\n\nHope everything's going well with ${businessName}!\n\nJust a friendly reminder that invoice #${invNum} for ${amount} was due a few days ago.\n\nYou can pay here: ${link}\n\nLet me know if you have any questions!\n\nBest,\nPushpal\nLevitate Labs`
      } else if (daysPast >= 7 && daysPast < 14 && invoice.reminder_count === 1) {
        subject = `Following up — Invoice #${invNum} (${amount})`
        message = `Hi ${clientName},\n\nFollowing up on the pending payment of ${amount} for your website project (Invoice #${invNum}).\n\nCould you let me know when you can process this?\n\nPayment link: ${link}\n\nIf there's any issue, just reply to this email and we'll sort it out.\n\nThanks,\nPushpal\nLevitate Labs`
      } else if (daysPast >= 14 && daysPast < 21 && invoice.reminder_count === 2) {
        subject = `Final reminder — Invoice #${invNum} is ${daysPast} days overdue`
        message = `Hi ${clientName},\n\nThis is our final reminder regarding invoice #${invNum} for ${amount}.\n\nPlease process the payment at your earliest convenience: ${link}\n\nIf there's any issue with the payment or the project delivery, please reach out immediately so we can resolve it.\n\nBest,\nPushpal\nLevitate Labs`
      } else if (daysPast >= 21 && invoice.reminder_count >= 3) {
        // Escalate to Pushpal
        await notifyFounder(
          `🚨 PAYMENT ESCALATION — Invoice #${invNum} (${daysPast} days overdue)`,
          `Invoice #${invNum} is ${daysPast} days overdue.\n\nClient: ${businessName}\nAmount: ${amount}\nEmail: ${clientEmail}\n\nPlease handle personally.\n\nPayment link: ${link}`
        )
        await awardCredits('invoice', CREDIT_EVENTS.PAYMENT_CHASED_3_TIMES, 'Overdue invoice escalated')
        continue
      }

      if (message && clientEmail) {
        await sendEmail(clientEmail, subject, message)
        await supabase.from('invoices').update({
          reminder_count: (invoice.reminder_count ?? 0) + 1,
          last_reminder_at: new Date().toISOString(),
          status: 'overdue'
        }).eq('id', invoice.id)
        chased++
      }
    }

    await supabase.from('agent_logs').insert({
      agent_name: 'invoice',
      action: 'daily_chase',
      input: { overdue_count: overdueInvoices?.length ?? 0 },
      output: { chased },
      status: 'success',
      credits_earned: chased * 2
    })

    console.log(`[InvoiceCheck] Chased ${chased} invoices`)
  } catch (err) {
    console.error('[InvoiceCheck] Failed:', err)
  }
}

export const config: Config = {
  schedule: '*/30 * * * *' // Every 30 minutes
}
