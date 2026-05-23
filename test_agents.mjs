import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Use real db so we can verify if it worked!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LOCAL_URL = 'http://localhost:3000';

/**
 * Ensures the database has a perfect "dummy" lead so outreach/followup works.
 */
async function setupTestData() {
  console.log('--- 1. Setting up Test Lead Data ---');
  
  // Clean up old ones
  await supabase.from('leads').delete().like('email', 'test_%@levitatelabs.com');
  
  // 1. Hot Lead for Outreach
  await supabase.from('leads').insert({
    name: 'Test Hot Lead ' + Date.now(),
    email: `test_outreach_${Date.now()}@levitatelabs.com`,
    service_category: 'testing',
    status: 'New',
    ai_score: 9,
  });
  console.log('✅ Injected Hot Lead for Outreach Agent');

  // 2. Contacted lead for Followup (Day 3)
  const day3 = new Date();
  day3.setDate(day3.getDate() - 3.5);
  await supabase.from('leads').insert({
    name: 'Test Followup Lead ' + Date.now(),
    email: `test_followup_${Date.now()}@levitatelabs.com`,
    service_category: 'testing',
    status: 'Contacted',
    outreach_count: 1,
    last_outreach_at: day3.toISOString()
  });
  console.log('✅ Injected Contacted Lead (3 days old) for Followup Agent');
  console.log('--------------------------------------\n');
}

/** Hit the endpoints to test */
async function runTests() {
  await setupTestData();
  let errors = 0;

  const internalToken = process.env.INTERNAL_FUNCTION_TOKEN;
  if (!internalToken) {
    console.error('❌ INTERNAL_FUNCTION_TOKEN not set in env. Aborting.');
    process.exit(1);
  }

  const headers = { 'Authorization': `Bearer ${internalToken}`, 'Content-Type': 'application/json' };

  const endpoints = [
    { name: 'BizDev Agent', route: '/api/bizdev/trigger', method: 'GET' },
    { name: 'Outreach Agent', route: '/api/outreach/trigger', method: 'POST' },
    { name: 'FollowUp Agent', route: '/api/followup/trigger', method: 'POST' },
    { name: 'Reporter Agent', route: '/api/reporter/trigger', method: 'POST' },
    { name: 'IMAP Sync', route: '/api/admin/mailbox/sync', method: 'POST' },
  ];

  console.log('--- 2. Triggering Agent Endpoints ---');
  console.log('NOTE: Your Next.js server MUST be running on localhost:3000 (npm run dev)\n');

  for (const ep of endpoints) {
    console.log(`⏳ Testing [${ep.name}] -> ${ep.route}...`);
    try {
      const resp = await fetch(`${LOCAL_URL}${ep.route}`, { method: ep.method, headers });
      const text = await resp.text();
      let parseData;
      try { parseData = JSON.parse(text); } catch { parseData = text.substring(0, 50) + '...'; }
      
      if (resp.ok) {
        console.log(`  ✅ SUCCESS (${resp.status}):`, parseData);
      } else {
        console.log(`  ❌ FAILED (${resp.status}):`, parseData);
        errors++;
      }
    } catch (err) {
      console.log(`  ❌ CONNECTION ERROR: Make sure localhost:3000 is running!`);
      errors++;
    }
  }

  console.log('\n--- 3. Verification ---');
  if (errors > 0) {
    console.log('⚠️ Some tests failed or could not connect.');
  } else {
    const { data: logs } = await supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(5);
    const { data: emails } = await supabase.from('agent_emails').select('*').order('created_at', { ascending: false }).limit(5);
    console.log(`✅ Verified: Found ${logs?.length} recent agent logs.`);
    console.log(`✅ Verified: Found ${emails?.length} recent tracked emails.`);
    console.log('Test complete! Your agents and IMAP are completely wired up.');
  }
}

runTests();
