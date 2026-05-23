import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTrigger() {
  const { data: allLeads, error } = await supabase
      .from('leads')
      .select('name, status, ai_score, email, last_outreach_at')
      .limit(10);
  console.log('leads:', allLeads);
}
testTrigger();
