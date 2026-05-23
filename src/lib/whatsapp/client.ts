/**
 * WhatsApp Local Daemon Bridge — Levitate Labs
 * Cloud agents call this to enqueue messages.
 * The local 'whatsapp-host.mjs' on admin's PC polls and sends them.
 */

import { getServiceSupabase } from '../supabase'

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const supabase = getServiceSupabase()

  // Normalize phone number (whatsapp-web.js format typically needs country code without + or just raw digits, but we will store normalized)
  const normalized = to.replace(/[^0-9]/g, '')

  try {
    const { error } = await supabase.from('whatsapp_queue').insert({
      to_number: normalized,
      message: message,
      status: 'pending'
    })

    if (error) {
      console.error('[WhatsApp Bridge] Failed to enqueue message:', error)
      return false
    }

    console.log(`[WhatsApp Bridge] Enqueued message to ${normalized}`)
    return true
  } catch (err) {
    console.error('[WhatsApp Bridge] Network error:', err)
    return false
  }
}

export function extractWhatsAppMessage(body: unknown): { from: string; text: string; messageId: string } | null {
  // Not needed for local WA right now but keeping signature
  return null
}

export async function sendWhatsAppToOwner(message: string): Promise<boolean> {
  const ownerNumber = process.env.YOUR_WHATSAPP_NUMBER
  if (!ownerNumber) return false
  return sendWhatsApp(ownerNumber, message)
}
