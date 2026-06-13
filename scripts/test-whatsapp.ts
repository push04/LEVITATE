/**
 * Meta WhatsApp Cloud API — connection test
 * Run: npx tsx scripts/test-whatsapp.ts
 *
 * Required env vars in .env.local:
 *   WHATSAPP_ACCESS_TOKEN    — Meta Cloud API token (never hardcode)
 *   WHATSAPP_PHONE_NUMBER_ID — e.g. 1107801055757202
 *   OWNER_WHATSAPP_NUMBER    — e.g. 916299549112
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const OWNER_NUMBER = process.env.OWNER_WHATSAPP_NUMBER

async function testConnection() {
  console.log('═══════════════════════════════════════════')
  console.log('  META WHATSAPP CLOUD API — TEST')
  console.log('═══════════════════════════════════════════\n')

  // 1. Check env vars
  console.log('▶ Checking env vars...')
  if (!TOKEN)           { console.error('  ✗ WHATSAPP_ACCESS_TOKEN not set'); process.exit(1) }
  if (!PHONE_NUMBER_ID) { console.error('  ✗ WHATSAPP_PHONE_NUMBER_ID not set'); process.exit(1) }
  if (!OWNER_NUMBER)    { console.error('  ✗ OWNER_WHATSAPP_NUMBER not set'); process.exit(1) }
  console.log(`  ✓ Token: ${TOKEN.slice(0, 8)}... (${TOKEN.length} chars)`)
  console.log(`  ✓ Phone Number ID: ${PHONE_NUMBER_ID}`)
  console.log(`  ✓ Owner number: ${OWNER_NUMBER}\n`)

  // 2. Verify phone number with Meta API (no message sent)
  console.log('▶ Verifying phone number ID with Meta...')
  const verifyRes = await fetch(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}?fields=id,display_phone_number,status,quality_rating`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(8000) }
  )
  const verifyData = await verifyRes.json() as Record<string, unknown>

  if (!verifyRes.ok) {
    console.error('  ✗ Phone number verification failed:')
    console.error('  ', JSON.stringify(verifyData, null, 2))
    console.log('\n  Common causes:')
    console.log('  • Token expired — generate a new one from Meta Developer Console')
    console.log('  • Wrong WHATSAPP_PHONE_NUMBER_ID')
    console.log('  • App not approved for WhatsApp Business Cloud API')
    process.exit(1)
  }

  console.log('  ✓ Phone number verified:')
  console.log(`    ID: ${verifyData.id}`)
  console.log(`    Display: ${verifyData.display_phone_number}`)
  console.log(`    Status: ${verifyData.status}`)
  console.log(`    Quality: ${verifyData.quality_rating}\n`)

  // 3. Send a test message
  console.log(`▶ Sending test message to ${OWNER_NUMBER}...`)
  const msgRes = await fetch(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: OWNER_NUMBER,
        type: 'text',
        text: { body: `✅ Levitate Labs — WhatsApp API test successful!\n\nYour hourly and daily notifications are configured correctly.\n\nTimestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` },
      }),
      signal: AbortSignal.timeout(10000),
    }
  )
  const msgData = await msgRes.json() as Record<string, unknown>

  if (!msgRes.ok) {
    console.error('  ✗ Message send failed:')
    console.error('  ', JSON.stringify(msgData, null, 2))
    console.log('\n  If error code 131047: You need an approved message template for')
    console.log('  business-initiated messages outside the 24-hour session window.')
    console.log('  Solution: Send a message from your WhatsApp to the business number first,')
    console.log('  then retry within 24 hours. OR create an approved template in Meta Business Manager.')
    process.exit(1)
  }

  const msgs = msgData.messages as Array<{ id: string }> | undefined
  console.log('  ✓ Message sent!')
  console.log(`  Message ID: ${msgs?.[0]?.id ?? 'N/A'}`)
  console.log('\n  Check your WhatsApp — test message delivered.\n')
  console.log('═══════════════════════════════════════════')
  console.log('  META WHATSAPP API: WORKING ✓')
  console.log('  Hourly and daily notifications will work.')
  console.log('═══════════════════════════════════════════')
}

testConnection().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
