/**
 * Onboarding Agent — Background Function
 * Triggered when advance payment is received.
 * Sends welcome message + onboarding checklist to new client.
 */

import { sendWhatsApp } from '../../src/lib/whatsapp/client'
import { getServiceSupabase } from '../../src/lib/supabase'
import { triggerGitHubAction } from '../../src/lib/supabase/tasks'

export default async (req: Request) => {
  const supabase = getServiceSupabase()

  try {
    const { projectId } = await req.json() as { projectId: string }

    const { data: project } = await supabase
      .from('projects')
      .select('*, clients(*)')
      .eq('id', projectId)
      .single()

    if (!project) return new Response('Project not found', { status: 404 })

    const client = project.clients
    const ownerName = client?.owner_name ?? 'there'

    // Send welcome WhatsApp
    const welcomeMsg = `🎉 Welcome to Levitate Labs, ${ownerName}!

Your project has officially started! Here's what happens next:

📋 *${project.name}*

✅ What we need from you:
1. Your business logo (if you have one)
2. 3-5 photos of your business
3. A description of your services/products
4. Any reference websites you like

📲 Just send them here on WhatsApp — we'll handle everything else!

Timeline: ${project.type === 'landing_page' ? '3' : project.type === 'business_website' ? '7' : '14'} working days

We'll send you a preview link as soon as the first version is ready. Stay tuned! 🚀

- Pushpal, Levitate Labs`

    if (client?.whatsapp) {
      await sendWhatsApp(client.whatsapp, welcomeMsg)
    }

    // Update project status
    await supabase.from('projects').update({
      status: 'advance_paid',
      started_at: new Date().toISOString(),
      current_agent: 'architect'
    }).eq('id', projectId)

    // Trigger GitHub Actions coding pipeline
    await triggerGitHubAction('new-coding-task', {
      project_id: projectId,
      project_name: project.name,
      project_type: project.type,
      requirements: project.requirements,
      client_name: client?.business_name
    })

    await supabase.from('agent_logs').insert({
      agent_name: 'onboarding',
      action: 'client_onboarded',
      project_id: projectId,
      input: { project_name: project.name },
      output: { welcome_sent: true, coding_triggered: true },
      status: 'success',
      credits_earned: 10
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error('[Onboarding] Failed:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
