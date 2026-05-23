/**
 * Base Agent — Levitate Labs
 * Every agent extends this. Handles logging, credits, and AI routing.
 */

import { callAI } from '@/lib/ai/router'

export interface AgentContext {
  [key: string]: unknown
}

export interface AgentResult {
  success: boolean
  output: Record<string, unknown>
  creditsEarned: number
  error?: string
}

export const CREDIT_EVENTS = {
  LEAD_FOUND_AND_SCORED: 5,
  LEAD_QUALIFIED: 20,
  PROPOSAL_SENT: 15,
  PROPOSAL_ACCEPTED: 50,
  CONTRACT_SIGNED: 30,
  ADVANCE_PAYMENT_RECEIVED: 75,
  FEATURE_CODED_CLEANLY: 10,
  ALL_TESTS_PASSED: 25,
  BUG_FIXED_FAST: 15,
  PROJECT_DELIVERED: 100,
  FINAL_PAYMENT_RECEIVED: 75,
  CLIENT_5_STAR: 50,
  RETENTION_UPSELL: 40,
  TASK_FAILED: -10,
  MAX_RETRIES_REACHED: -25,
  CODE_REVIEW_FAILED: -5,
  TEST_FAILURE_BY_BAD_CODE: -10,
  CLIENT_COMPLAINT: -30,
  PAYMENT_CHASED_3_TIMES: -5,
  PROPOSAL_REJECTED: -5
} as const

export abstract class BaseAgent {
  name: string
  version: string = '1.0'

  constructor(name: string) {
    this.name = name
  }

  abstract execute(context: AgentContext): Promise<AgentResult>

  async callAI(system: string, user: string, maxTokens = 2000): Promise<string> {
    return callAI(system, user, maxTokens, this.name)
  }

  async log(
    action: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>,
    status: 'success' | 'failure' | 'partial',
    durationMs: number,
    creditsEarned = 0,
    options: { projectId?: string; leadId?: string; taskId?: string; tokensUsed?: number; aiProvider?: string } = {}
  ) {
    try {
      const { getServiceSupabase } = await import('@/lib/supabase')
      const supabase = getServiceSupabase()

      await supabase.from('agent_logs').insert({
        agent_name: this.name,
        agent_version: this.version,
        action,
        input,
        output,
        status,
        duration_ms: durationMs,
        credits_earned: creditsEarned,
        tokens_used: options.tokensUsed ?? 0,
        ai_provider: options.aiProvider ?? 'unknown',
        project_id: options.projectId ?? null,
        lead_id: options.leadId ?? null,
        task_id: options.taskId ?? null
      })

      if (creditsEarned !== 0) {
        await this.updateCredits(creditsEarned, action)
      }
    } catch (err) {
      console.error(`[${this.name}] Logging failed:`, err)
    }
  }

  async updateCredits(amount: number, reason: string) {
    try {
      const { getServiceSupabase } = await import('@/lib/supabase')
      const supabase = getServiceSupabase()
      await supabase.rpc('update_agent_credits', {
        p_agent_name: this.name,
        p_amount: amount,
        p_reason: reason
      })
    } catch (err) {
      console.error(`[${this.name}] Credit update failed:`, err)
    }
  }

  async canRun(): Promise<boolean> {
    try {
      const { getServiceSupabase } = await import('@/lib/supabase')
      const supabase = getServiceSupabase()
      const { data } = await supabase
        .from('agent_rewards')
        .select('current_balance, is_suspended')
        .eq('agent_name', this.name)
        .single()

      if (data?.is_suspended) return false
      return (data?.current_balance ?? 0) > 0
    } catch {
      return true // Default allow if DB unavailable
    }
  }

  // Timed execution wrapper
  async run(context: AgentContext): Promise<AgentResult> {
    const start = Date.now()
    const canRun = await this.canRun()

    if (!canRun) {
      return { success: false, output: {}, creditsEarned: 0, error: 'Agent suspended or out of credits' }
    }

    try {
      const result = await this.execute(context)
      const duration = Date.now() - start
      await this.log('execute', context as Record<string, unknown>, result.output, result.success ? 'success' : 'failure', duration, result.creditsEarned)
      return result
    } catch (err) {
      const duration = Date.now() - start
      const error = err instanceof Error ? err.message : String(err)
      await this.log('execute', context as Record<string, unknown>, { error }, 'failure', duration, CREDIT_EVENTS.TASK_FAILED)
      return { success: false, output: { error }, creditsEarned: CREDIT_EVENTS.TASK_FAILED }
    }
  }
}

// Standalone credit award helper for non-class usage
export async function awardCredits(agentName: string, amount: number, reason = '') {
  try {
    const { getServiceSupabase } = await import('@/lib/supabase')
    const supabase = getServiceSupabase()
    await supabase.rpc('update_agent_credits', {
      p_agent_name: agentName,
      p_amount: amount,
      p_reason: reason
    })
  } catch (err) {
    console.error('awardCredits failed:', err)
  }
}

export async function agentCanRun(agentName: string): Promise<boolean> {
  try {
    const { getServiceSupabase } = await import('@/lib/supabase')
    const supabase = getServiceSupabase()
    const { data } = await supabase
      .from('agent_rewards')
      .select('current_balance, is_suspended')
      .eq('agent_name', agentName)
      .single()

    if (data?.is_suspended) return false
    return (data?.current_balance ?? 100) > 0
  } catch {
    return true
  }
}
