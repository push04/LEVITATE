import { getServiceSupabase } from '../../src/lib/supabase';

export const config = { background: true };

export default async (req: Request) => {
  let { job_id, agent_name, workspace_id, payload, model_name } = await req.json();
  
  try {
    // Check rate limits
    const { data: tracker } = await getServiceSupabase()
      .from('groq_rate_tracker')
      .select('*')
      .eq('model_name', model_name)
      .single();

    if (tracker && tracker.requests_today >= 950 && model_name.includes('70b')) {
      // Fallback to 8b model
      model_name = 'llama-3.1-8b-instant';
    }

    if (tracker && tracker.requests_this_minute >= 28) {
      // Wait for minute window reset
      await new Promise(r => setTimeout(r, 60000));
    }

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model_name,
        messages: [{ role: 'user', content: JSON.stringify(payload) }]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        await getServiceSupabase().from('groq_rate_tracker').update({
          backoff_until: new Date(Date.now() + 60000).toISOString()
        }).eq('model_name', model_name);
      }
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();

    // Update tracker
    await getServiceSupabase().from('groq_rate_tracker').update({
      requests_this_minute: (tracker?.requests_this_minute || 0) + 1,
      requests_today: (tracker?.requests_today || 0) + 1
    }).eq('model_name', model_name);

    // Update job status
    await getServiceSupabase().from('groq_job_queue').update({
      status: 'completed',
      processed_at: new Date().toISOString()
    }).eq('id', job_id);

    return new Response(JSON.stringify({ success: true, result }), { status: 200 });
  } catch (error) {
    await getServiceSupabase().from('groq_job_queue').update({
      status: 'failed',
      error_message: String(error)
    }).eq('id', job_id);

    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
};
