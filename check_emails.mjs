import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('agent_emails').select('*');
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  console.log('Sample:', data?.slice(0, 2));
}

check();
