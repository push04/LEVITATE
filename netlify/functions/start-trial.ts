import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  const { workspace_id } = JSON.parse(event.body || '{}');
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  await supabase.from('workspaces').update({
    plan: 'trial',
    trial: true,
    trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString()
  }).eq('id', workspace_id);
  
  // Seed demo data
  const { DEMO_LEADS } = await import('@/lib/demoData');
  await supabase.from('leads').insert(DEMO_LEADS.map(l => ({ ...l, workspace_id })));
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
