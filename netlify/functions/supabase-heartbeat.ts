/**
 * Supabase Heartbeat — Every 5 Days
 * Prevents the free-tier Supabase project from auto-pausing.
 * Schedule: Every 5 days at noon UTC
 */

import type { Config } from '@netlify/functions'
import { getServiceSupabase } from '../../src/lib/supabase'
import { requireInternalAuth } from './internal-auth'

export default async () => {
  const supabase = getServiceSupabase()
  // Just needs any DB activity
  await supabase.from('system_config').select('key').limit(1)
  console.log('[Heartbeat] Supabase pinged successfully')
}

export const config: Config = {
  schedule: '0 0 * * *' // Daily midnight
}
