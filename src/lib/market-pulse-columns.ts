import type { SupabaseClient } from '@supabase/supabase-js'

// Each of these column groups is added to daily_digest by its own migration
// file (marketpulse/db/*.sql) and may land independently of the others -
// probing each group separately (instead of one all-or-nothing "select
// everything, fall back to base on any error" check) means a page never
// silently loses fields that ARE already migrated just because some other,
// newer migration hasn't been applied yet.
const OPTIONAL_DIGEST_COLUMN_GROUPS = [
  'insider_buy_count_30d, insider_sell_count_30d',
  'analyst_target_mean_price, analyst_recommendation_key',
  'current_price, macd, macd_signal, sma_20, sma_50, adx_14, atr_14, stoch_k, cci_20, williams_r_14, volume, avg_volume_20, high_52w, low_52w',
  'signal_findings, risk_findings',
  'raw_trend_signal',
  'confidence_score, confidence_reason',
]

export async function buildDigestSelectColumns(supabase: SupabaseClient, baseColumns: string): Promise<string> {
  const results = await Promise.all(
    OPTIONAL_DIGEST_COLUMN_GROUPS.map(async (cols) => {
      const { error } = await supabase.from('daily_digest').select(cols).limit(1)
      return error ? null : cols
    })
  )
  const available = results.filter((c): c is string => c !== null)
  return [baseColumns, ...available].join(', ')
}
