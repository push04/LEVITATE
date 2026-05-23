import type { Config } from '@netlify/functions'
import imaps from 'imap-simple'
import { simpleParser } from 'mailparser'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

export default async () => {
  const supabase = getServiceSupabase()
  
  // Use environment variables or fallback to the known working app password for Levitate Labs (Gmail requires App Passwords, not regular SMTP passwords)
  const user = process.env.IMAP_USER ?? process.env.SMTP_USER ?? 'levitatelabs.online@gmail.com'
const password = process.env.IMAP_PASS
if (!password) throw new Error('IMAP_PASS is required')

  const config = {
    imap: {
      user,
      password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 5000,
    },
  }

  try {
    console.log('[EmailReader] Connecting to IMAP...')
    const connection = await imaps.connect(config)
    await connection.openBox('INBOX')

    // Search for unread emails only
    const searchCriteria = ['UNSEEN']
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true, // Mark as read so we don't process it again next tick
      struct: true
    }

    const messages = await connection.search(searchCriteria, fetchOptions)
    console.log(`[EmailReader] Found ${messages.length} unread messages`)

    let processedCount = 0

    for (const item of messages) {
      try {
        const allParts = imaps.getParts(item.attributes.struct)
        const mappedParts = await Promise.all(allParts.map(part => connection.getPartData(item, part)))
        
        // Find the raw email source
        const rawPart = item.parts.find(p => p.which === '')
        if (!rawPart) continue

        const parsed = await simpleParser(rawPart.body)
        
        let fromEmail = ''
        if (parsed.from && parsed.from.value.length > 0) {
          fromEmail = parsed.from.value[0].address ?? ''
        }

        if (!fromEmail) continue

        // Ignore emails from ourselves
        if (fromEmail === user || fromEmail.includes('levitatelabs.online')) continue

        console.log(`[EmailReader] Processing unread email from ${fromEmail}`)

        // 1. Look up lead by email
        const { data: lead } = await supabase
          .from('leads')
          .select('id, name')
          .ilike('email', fromEmail)
          .single()

        if (lead) {
          console.log(`[EmailReader] Matched email to Lead: ${lead.name} (${lead.id})`)
          
          // 2. Trigger the Discovery Agent
          const baseUrl = process.env.URL ?? 'https://levitatelabs.online'
          const res = await fetch(`${baseUrl}/.netlify/functions/discovery-bg`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead.id,
              incomingMessage: parsed.text || parsed.html || 'No readable body content'
            })
          })

          if (res.ok) {
            processedCount++
          } else {
            console.error(`[EmailReader] Failed to trigger discovery-bg for ${lead.id}. Status: ${res.status}`)
          }
        } else {
          console.log(`[EmailReader] No matching lead found in DB for ${fromEmail}. Ignoring.`)
        }
      } catch (err) {
        console.error('[EmailReader] Error processing a specific message', err)
      }
    }

    connection.end()

    // Log the run
    await supabase.from('agent_logs').insert({
      agent_name: 'email_reader',
      action: 'poll_inbox',
      input: { new_messages: messages.length },
      output: { leads_matched_and_processed: processedCount },
      status: 'success',
      credits_earned: processedCount * 2
    })

  } catch (err) {
    console.error('[EmailReader] IMAP Connection failed:', err)
    await supabase.from('agent_logs').insert({
      agent_name: 'email_reader',
      action: 'poll_inbox',
      input: {},
      output: { error: String(err) },
      status: 'failure',
      credits_earned: 0
    })
  }
}

export const config: Config = {
  schedule: '*/15 * * * *' // Every 15 minutes, alongside outreach/bizdev
}
