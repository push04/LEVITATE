/**
 * Task Queue Operations — Levitate Labs
 * Supabase-backed task queue (no Redis needed)
 */

import { sendWhatsAppToOwner } from '@/lib/whatsapp/client'
import { awardCredits, CREDIT_EVENTS } from '@/lib/agents/base-agent'

export async function getServiceDB() {
  const { getServiceSupabase } = await import('@/lib/supabase')
  return getServiceSupabase()
}

export async function claimTask(agentName: string, taskType: string) {
  const db = await getServiceDB()
  const { data } = await db.rpc('claim_task', {
    p_agent_name: agentName,
    p_task_type: taskType
  })
  return data
}

export async function completeTask(taskId: string, result: Record<string, unknown>) {
  const db = await getServiceDB()
  await db.from('tasks').update({
    status: 'done',
    completed_at: new Date().toISOString(),
    result
  }).eq('id', taskId)
}

export async function failTask(taskId: string, error: string) {
  const db = await getServiceDB()
  const { data: task } = await db.from('tasks').select('*').eq('id', taskId).single()
  if (!task) return

  if (task.attempt_count >= task.max_attempts) {
    await db.from('tasks').update({
      status: 'escalated',
      last_error: error,
      failed_at: new Date().toISOString()
    }).eq('id', taskId)

    await sendWhatsAppToOwner(
      `ESCALATION NEEDED\nAgent: ${task.assigned_agent}\nTask: ${task.title}\nError: ${error}\n\nCheck /admin/dashboard/logs`
    )
    await awardCredits(task.assigned_agent, CREDIT_EVENTS.MAX_RETRIES_REACHED, 'Max retries — escalated')
  } else {
    const retryAfter = new Date(Date.now() + Math.pow(2, task.attempt_count) * 60000)
    await db.from('tasks').update({
      status: 'pending',
      attempt_count: task.attempt_count + 1,
      scheduled_for: retryAfter.toISOString(),
      last_error: error,
      assigned_agent: null,
      claimed_at: null
    }).eq('id', taskId)

    await awardCredits(task.assigned_agent, CREDIT_EVENTS.TASK_FAILED, 'Task failed — retrying')
  }
}

export async function createTask(params: {
  type: string
  title: string
  description?: string
  projectId?: string
  clientId?: string
  leadId?: string
  priority?: number
  context?: Record<string, unknown>
  dependsOn?: string[]
  scheduledFor?: Date
}) {
  const db = await getServiceDB()
  const { data } = await db.from('tasks').insert({
    type: params.type,
    title: params.title,
    description: params.description,
    project_id: params.projectId,
    client_id: params.clientId,
    lead_id: params.leadId,
    priority: params.priority ?? 5,
    context: params.context ?? {},
    depends_on: params.dependsOn,
    scheduled_for: (params.scheduledFor ?? new Date()).toISOString()
  }).select().single()

  return data
}

export async function triggerGitHubAction(workflow: string, payload: Record<string, unknown>) {
  const token = process.env.GITHUB_TOKEN
  const org = process.env.GITHUB_ORG
  const repo = process.env.GITHUB_CODING_REPO ?? 'levitate-labs-coding'

  if (!token || !org) {
    console.warn('[GitHub] Missing GITHUB_TOKEN or GITHUB_ORG — skipping action trigger')
    return null
  }

  const res = await fetch(
    `https://api.github.com/repos/${org}/${repo}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: workflow,
        client_payload: payload
      })
    }
  )

  return res.ok
}

export async function getConfig(key: string) {
  const db = await getServiceDB()
  const { data } = await db.from('system_config').select('value').eq('key', key).single()
  return data?.value ?? {}
}
