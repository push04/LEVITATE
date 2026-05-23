import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLeads() {
  const { data: leads, error } = await supabase
      .from('leads')
      .select('name, source, status')
      .order('created_at', { ascending: false })
      .limit(20);
  if (error) {
    console.error(error);
  } else {
    for (const lead of leads) {
      console.log(`${lead.name} - ${lead.source} - ${lead.status}`);
    }
  }
}
checkLeads();
