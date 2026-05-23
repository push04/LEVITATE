import { sendWhatsApp } from './client'
import { BUSINESS_OUTREACH_WHATSAPP_TEMPLATE } from './templates'

type BusinessLeadLike = {
  name?: string | null
  phone?: string | null
  whatsapp?: string | null
}

export async function queueBusinessLeadWhatsApp(lead: BusinessLeadLike): Promise<boolean> {
  const phone = (lead.phone ?? lead.whatsapp ?? '').trim()

  if (!phone) {
    console.log(`[WhatsApp Queue] Skipping ${lead.name ?? 'lead'} - no phone number`)
    return false
  }

  return sendWhatsApp(phone, BUSINESS_OUTREACH_WHATSAPP_TEMPLATE)
}
