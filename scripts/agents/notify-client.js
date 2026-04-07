/**
 * Notify Client — sends WhatsApp with staging URL after deploy
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

async function sendWhatsApp(to, message) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneId || !token) { console.log('[WhatsApp] No credentials'); return }

  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/[^0-9]/g, ''), type: 'text', text: { body: message } })
  })
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID

  const stagingUrl = fs.existsSync('.deploy-url') ? fs.readFileSync('.deploy-url', 'utf-8').trim() : null
  if (!stagingUrl) { console.log('[Notify] No deploy URL found'); return }

  const { data: project } = await supabase.from('projects').select('*, clients(*)').eq('id', projectId).single()
  const client = project?.clients
  const ownerName = client?.owner_name ?? 'there'

  const clientMsg = `Hi ${ownerName}! 🎉

Your website for *${client?.business_name}* is ready for review!

🌐 Preview: ${stagingUrl}

Please take a look and reply:
✅ "APPROVED" — if everything looks great
📝 Tell me what you'd like changed

We'll make any changes within 24 hours. 🙏

- Pushpal, Levitate Labs`

  if (client?.whatsapp) await sendWhatsApp(client.whatsapp, clientMsg)

  // Notify Pushpal too
  const ownerMsg = `✅ WEBSITE READY FOR REVIEW!\n${client?.business_name}\n${stagingUrl}\n\nClient has been notified. Awaiting approval.`
  if (process.env.YOUR_WHATSAPP_NUMBER) await sendWhatsApp(process.env.YOUR_WHATSAPP_NUMBER, ownerMsg)

  console.log(`[Notify] Client notified at ${client?.whatsapp}`)
}

main().catch(err => { console.error('[Notify] FAILED:', err) })
