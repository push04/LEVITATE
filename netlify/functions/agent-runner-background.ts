import { getServiceSupabase } from '../../src/lib/supabase';

// Background Function - Agent Runner
export const config = { background: true };

export default async (req: Request) => {
  const supabase = getServiceSupabase();
  const { agent_name, workspace_id } = await req.json();

  try {
    // Fetch workspace and vertical config
    const { data: workspace } = await supabase.from('workspaces').select('*, vertical_configs(*)').eq('id', workspace_id).single();
    if (!workspace) return new Response('Workspace not found', { status: 404 });

    // Fetch agent schedule
    const { data: schedule } = await supabase.from('agent_schedules').select('*').eq('agent_name', agent_name).eq('workspace_id', workspace_id).single();

    // Call Groq via proxy with rate limiting
    const model = 'llama-3.1-8b-instant';
    const response = await callGroqWithRateLimit(supabase, model, workspace);

    // Update job queue status
    await supabase.from('groq_job_queue').update({ status: 'completed', processed_at: new Date().toISOString() }).eq('workspace_id', workspace_id).eq('agent_name', agent_name);

    // Log agent health
    await supabase.from('agent_health_log').insert({ agent_name, status: 'success', last_run_at: new Date().toISOString() });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    const supabase = getServiceSupabase();
    await supabase.from('agent_health_log').insert({ agent_name, status: 'failure', error_message: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
};

async function callGroqWithRateLimit(supabase: ReturnType<typeof getServiceSupabase>, model: string, workspace: any) {
  // Rate limit check
  const { data: tracker } = await supabase.from('groq_rate_tracker').select('*').eq('model_name', model).single();
  if (tracker && tracker.requests_today >= 950) {
    throw new Error('Daily rate limit reached');
  }

  // Call Groq API
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: `Run ${workspace.agent_name} for ${workspace.business_name}` }] })
  });

  // Update tracker
  await supabase.from('groq_rate_tracker').update({ requests_today: (tracker?.requests_today || 0) + 1 }).eq('model_name', model);

  return response.json();
}
