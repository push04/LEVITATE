import { NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const AGENT_META = [
  { agent_name: 'bizdev', label: 'BizDev', schedule: 'Every 2 hours' },
  { agent_name: 'research', label: 'Research', schedule: 'Every 15 mins' },
  { agent_name: 'outreach', label: 'Outreach', schedule: 'Every 15 mins' },
  { agent_name: 'followup', label: 'Follow-Up', schedule: 'Every 15 mins' },
  { agent_name: 'proposal', label: 'Proposal', schedule: 'On lead qualified' },
  { agent_name: 'retention', label: 'Retention', schedule: 'Every 12 hours' },
] as const

function hoursAgo(isoString: string) {
  return Date.now() - new Date(isoString).getTime() <= 24 * 60 * 60 * 1000
}

export async function GET() {
  try {
    const context = await getBusinessApiContext('automations')
    if (!context.portal.companyId) {
      return NextResponse.json({ success: false, error: 'Business company context is missing' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    const [metricsRes, logsRes, emailsRes] = await Promise.all([
      supabase
        .from('business_live_automation_metrics')
        .select('*')
        .eq('company_id', context.portal.companyId)
        .maybeSingle(),
      supabase
        .from('agent_logs')
        .select('id, agent_name, action, status, credits_earned, created_at, duration_ms')
        .eq('company_id', context.portal.companyId)
        .order('created_at', { ascending: false })
        .limit(48),
      supabase
        .from('agent_emails')
        .select('id, agent_name, direction, status, subject, from_email, to_email, created_at')
        .eq('company_id', context.portal.companyId)
        .order('created_at', { ascending: false })
        .limit(32),
    ])

    const isMissingCol = (e: unknown) =>
      e instanceof Error && (e.message.includes('column') && e.message.includes('does not exist') || (e as any).code === 'PGRST205')

    if (logsRes.error && !isMissingCol(logsRes.error)) {
      throw logsRes.error
    }

    if (emailsRes.error && !isMissingCol(emailsRes.error)) {
      throw emailsRes.error
    }

    const logs = logsRes.data ?? []
    const emails = emailsRes.data ?? []

    const metrics = metricsRes.error || !metricsRes.data
      ? {
          active_agents_24h: new Set(logs.filter((log) => hoursAgo(log.created_at)).map((log) => log.agent_name)).size,
          tasks_last_24h: logs.filter((log) => hoursAgo(log.created_at)).length,
          outbound_messages_total: emails.filter((email) => email.direction === 'outbound').length,
          avg_success_30d: (() => {
            if (logs.length === 0) return 0
            const successful = logs.filter((log) => ['success', 'sent', 'accepted'].includes(String(log.status || '').toLowerCase())).length
            return Math.round((successful / logs.length) * 100)
          })(),
        }
      : metricsRes.data

    const agentSummaries = Object.values(
      logs.reduce<Record<string, {
        agent_name: string
        label: string
        schedule: string
        tasks_last_24h: number
        success_rate: number
        is_suspended: boolean
        last_log: typeof logs[number] | null
      }>>((accumulator, log) => {
        const key = log.agent_name || 'automation'
        const meta = AGENT_META.find((item) => item.agent_name === key)
        if (!accumulator[key]) {
          accumulator[key] = {
            agent_name: key,
            label: meta?.label ?? key.replace(/_/g, ' '),
            schedule: meta?.schedule ?? 'Triggered by live activity',
            tasks_last_24h: 0,
            success_rate: 0,
            is_suspended: false,
            last_log: log,
          }
        }

        if (hoursAgo(log.created_at)) {
          accumulator[key].tasks_last_24h += 1
        }

        return accumulator
      }, {})
    ).map((agent) => {
      const agentLogs = logs.filter((log) => log.agent_name === agent.agent_name)
      const successful = agentLogs.filter((log) => ['success', 'sent', 'accepted'].includes(String(log.status || '').toLowerCase())).length

      return {
        ...agent,
        success_rate: agentLogs.length > 0 ? Math.round((successful / agentLogs.length) * 100) : 0,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          activeAgents: metrics.active_agents_24h ?? 0,
          totalTasks: metrics.tasks_last_24h ?? 0,
          outbound: metrics.outbound_messages_total ?? 0,
          inbound: emails.filter((email) => email.direction === 'inbound').length,
          avgSuccess: Math.round(Number(metrics.avg_success_30d ?? 0)),
        },
        agents: agentSummaries.sort((left, right) => right.tasks_last_24h - left.tasks_last_24h).slice(0, 8),
        schedules: AGENT_META.filter((item) => agentSummaries.some((summary) => summary.agent_name === item.agent_name)).map((item) => ({
          agent: item.agent_name,
          schedule: item.schedule,
        })),
        logs: logs.slice(0, 12),
        emails: emails.slice(0, 8),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load business automations' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : error instanceof Error && (error.message === 'Active subscription required' || error.message.includes('feature is not enabled')) ? 403 : 500 }
    )
  }
}
