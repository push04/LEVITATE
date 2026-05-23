import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const buildSecret = event.headers['x-build-secret'];
  if (buildSecret !== process.env.BUILD_CALLBACK_SECRET) return { statusCode: 401, body: 'Unauthorized' };

  const { order_id, workspace_id, status, live_url, netlify_site_id, build_completed_at } = JSON.parse(event.body || '{}');

  await supabase.from('website_orders').update({ status, live_url, netlify_site_id, build_completed_at }).eq('id', order_id);

  if (status === 'deployed') {
    await supabase.from('workspaces').update({ website_live_url: live_url, website_netlify_site_id: netlify_site_id, website_deployed_at: build_completed_at }).eq('id', workspace_id);
    await supabase.from('workspaces').update({ first_agent_output_at: build_completed_at, first_agent_output_type: 'website_deployed' }).eq('id', workspace_id).is('first_agent_output_at', null);
  }

  return { statusCode: 200, body: 'OK' };
};
