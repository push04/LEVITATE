/**
 * LEVITATE schema migration runner
 * Usage: node scripts/migrate.js <supabase_personal_access_token>
 *
 * Get your token from: https://app.supabase.com/account/tokens
 */

const https = require('https')

const PROJECT_REF = 'eelwkowdkpmobbudqqlb'
const token = process.argv[2]

if (!token) {
  console.error('Usage: node scripts/migrate.js <supabase_personal_access_token>')
  console.error('Get token from: https://app.supabase.com/account/tokens')
  process.exit(1)
}

const MIGRATIONS = [
  {
    name: 'leads — add company_id and user_id',
    sql: `
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id uuid;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id uuid;
      CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
      CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
    `,
  },
  {
    name: 'companies — add plan and trial columns',
    sql: `
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter';
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial boolean DEFAULT false;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone;
    `,
  },
  {
    name: 'onboarding_subscriptions — add workspace_slug and workspace_backlink_url',
    sql: `
      ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS workspace_slug text;
      ALTER TABLE onboarding_subscriptions ADD COLUMN IF NOT EXISTS workspace_backlink_url text;
      CREATE INDEX IF NOT EXISTS idx_onboarding_workspace_slug ON onboarding_subscriptions(workspace_slug);
    `,
  },
  {
    name: 'busy_sync_logs — create table',
    sql: `
      CREATE TABLE IF NOT EXISTS busy_sync_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        sync_type text,
        entity_type text,
        status text,
        records_total integer DEFAULT 0,
        records_imported integer DEFAULT 0,
        records_skipped integer DEFAULT 0,
        records_failed integer DEFAULT 0,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_busy_sync_logs_created ON busy_sync_logs(created_at DESC);
    `,
  },
  {
    name: 'newsletter_subscribers — create table',
    sql: `
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        email text UNIQUE NOT NULL,
        name text,
        status text DEFAULT 'active',
        source text,
        confirmed_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now()
      );
    `,
  },
  {
    name: 'newsletter_subscriptions — create table',
    sql: `
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        email text UNIQUE NOT NULL,
        status text DEFAULT 'subscribed',
        created_at timestamp with time zone DEFAULT now()
      );
    `,
  },
  {
    name: 'groq_rate_tracker — create table',
    sql: `
      CREATE TABLE IF NOT EXISTS groq_rate_tracker (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid,
        endpoint text,
        tokens_used integer DEFAULT 0,
        requests_count integer DEFAULT 0,
        window_start timestamp with time zone DEFAULT now(),
        created_at timestamp with time zone DEFAULT now()
      );
    `,
  },
  {
    name: 'conversion_events — create table',
    sql: `
      CREATE TABLE IF NOT EXISTS conversion_events (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid,
        company_id uuid,
        event_type text,
        source text,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now()
      );
    `,
  },
  {
    name: 'webhooks — create table',
    sql: `
      CREATE TABLE IF NOT EXISTS webhooks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid,
        company_id uuid,
        url text NOT NULL,
        events text[],
        is_active boolean DEFAULT true,
        secret text,
        created_at timestamp with time zone DEFAULT now()
      );
    `,
  },
]

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  console.log(`\nLEVITATE Schema Migration Runner`)
  console.log(`Project: ${PROJECT_REF}`)
  console.log(`Migrations: ${MIGRATIONS.length}\n`)
  console.log('─'.repeat(55))

  let passed = 0, failed = 0

  for (const m of MIGRATIONS) {
    process.stdout.write(`  ${m.name} ... `)
    try {
      await runQuery(m.sql)
      console.log('OK')
      passed++
    } catch (err) {
      const msg = err.message.replace(/[\r\n]+/g, ' ').slice(0, 120)
      console.log(`FAIL — ${msg}`)
      failed++
    }
  }

  console.log('─'.repeat(55))
  console.log(`\nDone: ${passed} passed, ${failed} failed`)

  if (failed === 0) {
    console.log('\nAll migrations applied. Your Busy integration is ready.')
  } else {
    console.log('\nSome migrations failed. Check errors above.')
    console.log('You can also run them manually in Supabase SQL Editor.')
  }
}

main().catch(console.error)
