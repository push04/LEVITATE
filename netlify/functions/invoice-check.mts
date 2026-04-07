/**
 * Invoice Chase Agent — Daily 9 AM IST
 * Automatically follows up on unpaid invoices.
 * Day 3: friendly reminder | Day 7: firm | Day 14: final | Day 21+: escalate to Pushpal
 * Schedule: 3:30 AM UTC = 9:00 AM IST
 */

import type { Config } from '@netlify/functions'
import { sendWhatsApp, sendWhatsAppToOwner } from '../../src/lib/whatsapp/client'
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
      const link = invoice.razorpay_payment_link
      const amount = `₹${Number(invoice.total).toLocaleString('en-IN')}`
      const invNum = invoice.invoice_number

      let message = ''

      if (daysPast >= 3 && daysPast < 7 && invoice.reminder_count === 0) {
        message = `Hi ${clientName}! 😊 Just a friendly reminder — invoice #${invNum} of ${amount} was due a few days ago.\n\nPay here: ${link}\n\nLet me know if you need anything! 🙏`
      } else if (daysPast >= 7 && daysPast < 14 && invoice.reminder_count === 1) {
        message = `Hi ${clientName}, following up on the pending payment of ${amount} for your website project (Invoice #${invNum}).\n\nCould you let me know when you can process this?\nPayment: ${link}`
      } else if (daysPast >= 14 && daysPast < 21 && invoice.reminder_count === 2) {
        message = `Hi ${clientName}, this is our final reminder for ${amount} (Invoice #${invNum}).\n\nPlease process at your earliest convenience: ${link}\n\nIf there's any issue, just reply here and we'll sort it out. 🙏`
      } else if (daysPast >= 21 && invoice.reminder_count >= 3) {
        // Escalate to Pushpal
        await sendWhatsAppToOwner(
          `⚠️ PAYMENT ESCALATION\nInvoice #${invNum} is ${daysPast} days overdue\nClient: ${invoice.clients?.business_name}\nAmount: ${amount}\nPhone: ${invoice.clients?.whatsapp}\n\nPlease handle personally.`
        )
        await awardCredits('invoice', CREDIT_EVENTS.PAYMENT_CHASED_3_TIMES, 'Overdue invoice escalated')
        continue
      }

      if (message && invoice.clients?.whatsapp) {
        await sendWhatsApp(invoice.clients.whatsapp, message)
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
  schedule: '30 3 * * *' // 9:00 AM IST
}
