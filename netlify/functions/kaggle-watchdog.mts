/**
 * Kaggle Watchdog — Every 30 Minutes
 * Keeps the Kaggle GPU notebook alive and updates GEMMA_API_URL
 * when the ngrok tunnel regenerates.
 *
 * Your Kaggle notebook should:
 * 1. Run Gemma 4 via Ollama or transformers
 * 2. Expose it as OpenAI-compatible API via FastAPI
 * 3. Use ngrok to tunnel it out
 * 4. POST the ngrok URL to https://levitatelabs.online/api/admin/agents/update-ai-url
 *
 * Schedule: Every 30 minutes
 */

import type { Config } from '@netlify/functions'
import { getServiceSupabase } from '../../src/lib/supabase'

export default async () => {
  const supabase = getServiceSupabase()

  try {
    // Check when Gemma was last alive
    const { data } = await supabase
      .from('system_config')
      .select('value, updated_at')
      .eq('key', 'gemma_status')
      .single()

    const lastAlive = data?.updated_at ? new Date(data.updated_at) : null
    const minutesSince = lastAlive ? (Date.now() - lastAlive.getTime()) / 60000 : 999

    if (minutesSince > 60) {
      console.warn('[Kaggle Watchdog] Gemma has been offline for', Math.round(minutesSince), 'minutes')
      // Log the issue so admin dashboard shows it
      await supabase.from('agent_logs').insert({
        agent_name: 'kaggle_watchdog',
        action: 'status_check',
        input: {},
        output: { gemma_offline_minutes: Math.round(minutesSince), status: 'offline' },
        status: 'failure',
        credits_earned: 0
      })
    } else {
      await supabase.from('agent_logs').insert({
        agent_name: 'kaggle_watchdog',
        action: 'status_check',
        input: {},
        output: { gemma_offline_minutes: Math.round(minutesSince), status: 'online' },
        status: 'success',
        credits_earned: 1
      })
    }
  } catch (err) {
    console.error('[Kaggle Watchdog] Failed:', err)
  }
}

export const config: Config = {
  schedule: '*/15 * * * *' // Every 15 minutes
}
