import { serve } from 'https://deno.land/x/supabase@0.37.3/functions/index.ts';

serve(async () => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('groq_job_queue').delete().lt('created_at', weekAgo).in('status', ['completed', 'failed']);
  await supabase.from('agent_health_log').delete().lt('created_at', weekAgo);
  await supabase.from('conversion_events').delete().lt('created_at', ninetyDaysAgo);
  await supabase.from('drip_emails_sent').delete().lt('sent_at', ninetyDaysAgo);

  return new Response(JSON.stringify({ cleaned: true }));
});
