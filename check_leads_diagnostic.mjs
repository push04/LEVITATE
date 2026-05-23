import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('=== Lead Database Diagnostic ===\n');

  // Total leads
  const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`Total leads in DB:          ${total}`);

  // By source
  const { data: sources } = await supabase.from('leads').select('source');
  const bySource = {};
  for (const r of sources || []) {
    const s = r.source || 'NULL';
    bySource[s] = (bySource[s] || 0) + 1;
  }
  console.log('\nBreakdown by source:');
  for (const [s, c] of Object.entries(bySource)) console.log(`  ${s}: ${c}`);

  // Eligible for outreach (what the agent actually picks up)
  const { count: eligible } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'New')
    .is('last_outreach_at', null)
    .eq('source', 'bizdev_agent')
    .or('email.neq.null,phone.neq.null');
  console.log(`\nEligible for outreach (source=bizdev_agent, status=New, has phone/email): ${eligible}`);

  // Leads with phone numbers (regardless of source)
  const { count: hasPhone } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null)
    .eq('status', 'New');
  console.log(`Leads with phone numbers (status=New):  ${hasPhone}`);

  // WhatsApp queue
  const { data: queue } = await supabase.from('whatsapp_queue').select('status');
  const pending = queue?.filter(m => m.status === 'pending').length || 0;
  const sent = queue?.filter(m => m.status === 'sent').length || 0;
  console.log(`\nWhatsApp Queue: ${pending} pending, ${sent} sent`);

  console.log('\n=== FIX: Update existing leads to source=bizdev_agent? ===');
  const { count: nullSource } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .is('source', null)
    .eq('status', 'New');
  console.log(`Leads with source=NULL and status=New: ${nullSource}`);
  if (nullSource > 0) {
    console.log('\nRun this in Supabase SQL Editor to unlock all your existing leads for outreach:');
    console.log("UPDATE leads SET source = 'bizdev_agent' WHERE source IS NULL AND status = 'New';");
  }
}

diagnose().catch(console.error);
