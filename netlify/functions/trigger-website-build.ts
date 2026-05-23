import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  const { workspace_id, order_id, vertical, business_name, city, color_scheme, pages } = JSON.parse(event.body || '{}');
  
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GH_OWNER}/${process.env.GH_WEBSITE_REPO}/actions/workflows/build-website.yml/dispatches`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify({ ref: 'main', inputs: { workspace_id, order_id, vertical, business_name, city, color_scheme: JSON.stringify(color_scheme), pages_requested: pages.join(',') } })
    }
  );

  if (!response.ok) {
    await supabase.from('system_alerts').insert({ type: 'github_dispatch_failed', details: await response.text() });
    return { statusCode: 500, body: JSON.stringify({ error: 'Build trigger failed' }) };
  }

  await supabase.from('website_orders').update({ status: 'queued', triggered_at: new Date().toISOString() }).eq('id', order_id);
  return { statusCode: 200, body: JSON.stringify({ message: 'Build queued' }) };
};
