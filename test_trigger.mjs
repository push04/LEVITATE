import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTrigger() {
  const { data: hotLeads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'New')
      .gte('ai_score', 6)
      .is('last_outreach_at', null)
      .not('email', 'is', null)
      .limit(3);
  console.log('hotLeads error:', error);
  console.log('hotLeads:', hotLeads?.length);
}
testTrigger();
