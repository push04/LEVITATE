import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOld() {
  const { data, error } = await supabase.from('email_messages').select('*');
  console.log('Old emails count:', data?.length);
  if (data?.length) console.log(data[0]);
}
checkOld();
