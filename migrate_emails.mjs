import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('Migrating past emails...');
  const { data: messages, error } = await supabase.from('email_messages').select('*, email_threads(category)');
  if (!messages || messages.length === 0) return;

  for (const m of messages) {
    const category = m.email_threads?.category || 'general';
    const agentName = category === 'outreach' ? 'outreach' : 
                      category === 'report' ? 'reporter' : 
                      category === 'followup' ? 'followup' : 'inbound_bot';
    
    const { data: existing } = await supabase.from('agent_emails')
      .select('id')
      .eq('subject', m.subject || '')
      .eq('created_at', m.created_at)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from('agent_emails').insert({
        agent_name: agentName,
        direction: m.direction,
        to_email: m.to_email ? m.to_email[0] : null,
        from_email: m.from_email,
        subject: m.subject,
        body: m.body_text || m.body_html || '',
        status: m.direction === 'inbound' ? 'received' : 'sent',
        created_at: m.created_at
      });
      console.log('Migrated:', m.subject);
    }
  }
}

migrate();
