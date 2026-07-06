import type { SupabaseClient } from '@supabase/supabase-js'

export type PredictionTracking = {
  predictionDate: string
  signal: string
  priceAtPrediction: number
  targetDate: string
  evaluated: boolean
  outcome: string | null
  priceChangePct: number | null // only set once evaluated
  accuracy: { correct: number; total: number; pct: number | null } // this ticker's own track record, evaluated predictions only
}

// One prediction row per ticker per day (predictions.ticker,prediction_date is
// unique) - this loads one per ticker, plus that ticker's own historical
// hit-rate, in a single query rather than N+1s. When asOfDate is given (the
// digest date the user is browsing), it picks that day's own prediction per
// ticker instead of always the latest - since data is ordered most-recent
// first, the first row per ticker with date <= asOfDate is either the exact
// match or the nearest one before it. Accuracy stays computed across ALL of
// a ticker's evaluated history regardless of asOfDate - it's that ticker's
// overall track record, not scoped to one day.
export async function loadPredictionTracking(supabase: SupabaseClient, tickers: string[], asOfDate?: string): Promise<Map<string, PredictionTracking>> {
  if (tickers.length === 0) return new Map()

  const { data } = await supabase
    .from('predictions')
    .select('ticker, prediction_date, signal, price_at_prediction, target_date, evaluated, outcome, price_change_pct')
    .in('ticker', tickers)
    .order('prediction_date', { ascending: false })

  const latestByTicker = new Map<string, Record<string, unknown>>()
  const accuracyByTicker = new Map<string, { correct: number; total: number }>()

  for (const row of data ?? []) {
    const ticker = row.ticker as string
    if (!latestByTicker.has(ticker) && (!asOfDate || (row.prediction_date as string) <= asOfDate)) {
      latestByTicker.set(ticker, row)
    }
    if (row.evaluated) {
      const acc = accuracyByTicker.get(ticker) ?? { correct: 0, total: 0 }
      acc.total++
      if (row.outcome === 'correct') acc.correct++
      accuracyByTicker.set(ticker, acc)
    }
  }

  const result = new Map<string, PredictionTracking>()
  for (const ticker of tickers) {
    const latest = latestByTicker.get(ticker)
    if (!latest) continue
    const acc = accuracyByTicker.get(ticker) ?? { correct: 0, total: 0 }
    result.set(ticker, {
      predictionDate: latest.prediction_date as string,
      signal: latest.signal as string,
      priceAtPrediction: latest.price_at_prediction as number,
      targetDate: latest.target_date as string,
      evaluated: latest.evaluated as boolean,
      outcome: (latest.outcome as string | null) ?? null,
      priceChangePct: (latest.price_change_pct as number | null) ?? null,
      accuracy: { correct: acc.correct, total: acc.total, pct: acc.total > 0 ? Math.round((acc.correct / acc.total) * 1000) / 10 : null },
    })
  }
  return result
}
