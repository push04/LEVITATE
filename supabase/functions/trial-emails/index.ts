import { serve } from 'https://deno.land/x/supabase@0.37.3/functions/index.ts'

serve(async (req) => {
  const { workspace_id, day } = await req.json()
  const { data: workspace } = await supabase.from('workspaces').select('*').eq('id', workspace_id).single()
  if (!workspace) return new Response('Not found', { status: 404 })
  
  const emails = {
    1: { subject: `Your BizDev Agent found leads in ${workspace.business_city}`, body: 'Here is what it found...' },
    3: { subject: 'Your Outreach Agent drafted 8 messages', body: 'Upgrade to send them...' },
    7: { subject: 'Your pipeline at halfway point', body: 'Heres the comparison...' },
    12: { subject: 'Trial ends in 2 days', body: '47 leads found, 12 responded...' },
    14: { subject: 'Trial has ended', body: 'Your data is saved for 7 days...' }
  }
  
  const email = emails[day as keyof typeof emails]
  if (!email) return new Response('Invalid day', { status: 400 })
  
  // Send via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}` },
    body: JSON.stringify({ from: 'hello@levitatelabs.online', to: workspace.owner_email, subject: email.subject, html: email.body })
  })
  
  return new Response(JSON.stringify({ sent: true }))
})
