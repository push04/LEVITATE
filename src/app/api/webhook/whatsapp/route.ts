/**
 * WhatsApp Webhook Handler
 * GET: Webhook verification by Meta
 * POST: Incoming messages → triggers Discovery Agent
 */

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { extractWhatsAppMessage } from '@/lib/whatsapp/client'
import crypto from 'crypto'

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) {
    return process.env.NODE_ENV !== 'production'
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)

  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// GET — Meta webhook verification
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// POST — Incoming WhatsApp messages
export async function POST(req: Request) {
  const supabase = getServiceSupabase()

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')

    if (!verifyMetaSignature(rawBody, signature)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = JSON.parse(rawBody)
    const message = extractWhatsAppMessage(body)

    if (!message?.text || !message.from) {
      return new NextResponse('OK', { status: 200 })
    }

    // Find lead by phone number (WhatsApp number)
    const normalized = message.from.replace(/[^0-9]/g, '')
    const { data: lead } = await supabase
      .from('leads')
      .select('id, status, whatsapp, phone')
      .or(`whatsapp.ilike.%${normalized},phone.ilike.%${normalized}`)
      .limit(1)
      .single()

    if (lead) {
      // Save incoming message to messages table
      await supabase.from('messages').insert({
        lead_id: lead.id,
        direction: 'inbound',
        channel: 'whatsapp',
        content: message.text,
        whatsapp_message_id: message.messageId,
        processed: false
      })

      // Trigger Discovery Agent as background function (non-blocking)
      fetch(`${process.env.URL ?? 'https://levitatelabs.online'}/.netlify/functions/discovery-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, incomingMessage: message.text })
      }).catch(err => console.error('[WhatsApp Webhook] Failed to trigger discovery:', err))
    } else {
      // Unknown sender — might be an existing client
      const { data: client } = await supabase
        .from('clients')
        .select('id, whatsapp')
        .ilike('whatsapp', `%${normalized}%`)
        .limit(1)
        .single()

      if (client) {
        await supabase.from('messages').insert({
          client_id: client.id,
          direction: 'inbound',
          channel: 'whatsapp',
          content: message.text,
          whatsapp_message_id: message.messageId
        })
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('[WhatsApp Webhook] Error:', err)
    return new NextResponse('OK', { status: 200 }) // Always return 200 to Meta
  }
}
