import fs from 'fs'
import dotenv from 'dotenv'

const PLACEHOLDER_MARKERS = ['placeholder.supabase.co', '.placeholder', 'placeholder@gmail.com', 'placeholder']
const isUsable = (value) => {
  if (!value) return false
  const s = String(value).trim()
  if (!s) return false
  const l = s.toLowerCase()
  return !PLACEHOLDER_MARKERS.some((m) => l.includes(m))
}

const parseEnv = (p) => (fs.existsSync(p) ? dotenv.parse(fs.readFileSync(p)) : {})
const env = {}
const mergeUsable = (src) => {
  for (const [k, v] of Object.entries(src || {})) {
    if (isUsable(v)) env[k] = String(v).trim()
  }
}

mergeUsable(parseEnv('.env'))
mergeUsable(parseEnv('.env.local'))

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!isUsable(SUPABASE_URL) || !isUsable(SERVICE_KEY)) {
  console.error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY (or they are still placeholders).')
  process.exit(1)
}

const base = SUPABASE_URL.replace(/\/$/, '')
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function main() {
  // 1) Check table exists (schema cache)
  const check = await fetch(`${base}/rest/v1/onboarding_coupons?select=id&limit=1`, { headers })
  const checkText = await check.text()
  console.log('check_status=', check.status)
  if (!check.ok) {
    console.log('check_body=', checkText)
    console.log('\nFix: run add_business_growth_backlinks_coupons_and_crm.sql in Supabase SQL Editor, then retry.')
    process.exit(2)
  }

  // 2) Try create a test coupon
  const code = 'TESTAPR25'
  await fetch(`${base}/rest/v1/onboarding_coupons?code=eq.${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers,
  })

  const payload = {
    code,
    name: 'Test Coupon (Apr 25)',
    description: 'Created by scripts/verify-coupons.mjs',
    status: 'active',
    discount_type: 'percentage',
    discount_value: 10,
    max_redemptions: 5,
    redemption_count: 0,
    min_order_amount: 0,
    max_discount_amount: null,
    valid_from: null,
    valid_until: null,
    applies_to_all_plans: true,
    eligible_plan_ids: [],
    usage_scope: 'global',
    is_stackable: false,
  }

  const ins = await fetch(`${base}/rest/v1/onboarding_coupons`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const insText = await ins.text()
  console.log('insert_status=', ins.status)
  console.log('insert_body=', insText)

  process.exit(ins.ok ? 0 : 3)
}

main().catch((e) => {
  console.error(String(e?.message || e))
  process.exit(1)
})

