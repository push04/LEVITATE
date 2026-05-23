import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOld() {
  const { data: messages, error: err1 } = await supabase.from('messages').select('*').limit(3);
  console.log('Old "messages" count:', messages?.length, 'Errors:', err1);
  if (messages?.length) console.log(messages[0]);

  const { data: conversations, error: err2 } = await supabase.from('conversations').select('*').limit(3);
  console.log('Conversations count:', conversations?.length, 'Errors:', err2);
}
checkOld();
