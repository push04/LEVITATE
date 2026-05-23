export const config = { schedule: "*/2 * * * *" };

export default async () => {
  const now = new Date();
  
  await supabase.from('agent_schedules').update({ run_count_today: 0, day_start: now.toISOString().split('T')[0] }).lt('day_start', now.toISOString().split('T')[0]);

  const { data: dueJobs } = await supabase.from('agent_schedules').select('*, workspaces(plan, daily_quota_remaining)').eq('enabled', true).lte('next_run_at', now.toISOString()).gt('workspaces.daily_quota_remaining', 0).order('priority', { ascending: false }).limit(3);

  for (const job of dueJobs ?? []) {
    await supabase.from('groq_job_queue').insert({ agent_name: job.agent_name, workspace_id: job.workspace_id, payload: {}, model_name: 'llama-3.3-70b', priority: job.priority, status: 'pending', scheduled_after: now.toISOString() });
    
    fetch(`${process.env.NEXT_PUBLIC_PLATFORM_URL}/.netlify/functions/agent-runner-background`, { method: 'POST', body: JSON.stringify({ agent_name: job.agent_name, workspace_id: job.workspace_id }) });

    const nextRun = new Date(now.getTime() + 24*60*60*1000); // simplified cron
    await supabase.from('agent_schedules').update({ last_run_at: now.toISOString(), next_run_at: nextRun.toISOString() }).eq('id', job.id);
  }
};
