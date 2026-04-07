/**
 * WhatsApp Business API Client — Levitate Labs
 * Meta Cloud API v18.0
 */

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneId || !token) {
    console.warn('[WhatsApp] Missing credentials — message not sent')
    return false
  }

  // Normalize phone number
  const normalized = to.replace(/[^0-9]/g, '')

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalized,
          type: 'text',
          text: { body: message, preview_url: false }
        })
      }
    )

    const data = await res.json()
    if (data.error) {
      console.error('[WhatsApp] Send error:', data.error)
      return false
    }

    return true
  } catch (err) {
    console.error('[WhatsApp] Network error:', err)
    return false
  }
}

export function extractWhatsAppMessage(body: unknown): { from: string; text: string; messageId: string } | null {
  try {
    const b = body as Record<string, unknown>
    const entry = (b.entry as unknown[])?.[0] as Record<string, unknown>
    const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown>
    const value = changes?.value as Record<string, unknown>
    const messages = value?.messages as unknown[]
    const msg = messages?.[0] as Record<string, unknown>

    if (!msg) return null

    return {
      from: String(msg.from ?? ''),
      text: (msg.text as Record<string, unknown>)?.body as string ?? '',
      messageId: String(msg.id ?? '')
    }
  } catch {
    return null
  }
}

export async function sendWhatsAppToOwner(message: string): Promise<boolean> {
  const ownerNumber = process.env.YOUR_WHATSAPP_NUMBER
  if (!ownerNumber) return false
  return sendWhatsApp(ownerNumber, message)
}
