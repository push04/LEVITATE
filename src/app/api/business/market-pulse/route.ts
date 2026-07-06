import { NextRequest, NextResponse } from 'next/server'
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'
import { buildDigestSelectColumns } from '@/lib/market-pulse-columns'
import { loadPredictionTracking } from '@/lib/market-pulse-predictions'
import { loadTickerNews } from '@/lib/market-pulse-ticker-news'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireBusinessCompany('marketPulse')
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const supabase = getServiceSupabase()
  const requestedDate = request.nextUrl.searchParams.get('date')

  // Digest is written once a day by the marketpulse scraper — default to
  // whatever the most recent digest_date actually is rather than assuming
  // "today" (the scraper may not have run yet, or ran in a different
  // timezone), but let the caller pick an earlier date to browse history.
  const { data: dateRows } = await supabase
    .from('daily_digest')
    .select('digest_date')
    .order('digest_date', { ascending: false })

  const availableDates = Array.from(new Set((dateRows ?? []).map((r) => r.digest_date as string)))

  if (availableDates.length === 0) {
    return NextResponse.json({ digestDate: null, digest: [], news: [], availableDates: [] })
  }

  const digestDate = requestedDate && availableDates.includes(requestedDate) ? requestedDate : availableDates[0]

  // Optional columns land via separate migrations that may not all be
  // applied yet — probed per-group (see buildDigestSelectColumns) so one
  // pending migration never hides fields from ones already applied.
  const BASE_DIGEST_COLUMNS =
    'ticker, company_name, sector, sentiment_trend, avg_confidence, news_count, price_change_pct, rsi_14, trend_signal, divergence_flag, summary_text, detailed_analysis, risk_notes, risk_level'
  const selectColumns = await buildDigestSelectColumns(supabase, BASE_DIGEST_COLUMNS)

  const { data: digestRaw, error: digestError } = await supabase
    .from('daily_digest')
    .select(selectColumns)
    .eq('digest_date', digestDate)
    .order('divergence_flag', { ascending: false })
    .order('avg_confidence', { ascending: false })

  if (digestError) return NextResponse.json({ error: digestError.message }, { status: 500 })

  // Dynamic select-string means supabase-js can't statically infer the row
  // shape (falls back to a GenericStringError type) — cast to the shape we
  // know it has at runtime given selectColumns above.
  const digest = digestRaw as unknown as Array<Record<string, unknown> & { ticker: string }> | null

  const { data: fundamentalsRows } = await supabase
    .from('fundamentals')
    .select('ticker, pe_forward, return_on_equity, return_on_assets, debt_to_equity, revenue_growth, earnings_growth, profit_margin, analyst_target_mean_price, analyst_recommendation_key, number_of_analyst_opinions, beta')
  const fundamentalsByTicker = new Map((fundamentalsRows ?? []).map((f) => [f.ticker, f]))

  const tickers = (digest ?? []).map((d) => d.ticker)
  const predictionByTicker = await loadPredictionTracking(supabase, tickers, digestDate)
  const newsByTicker = await loadTickerNews(supabase, tickers)

  const digestWithFundamentals = (digest ?? []).map((d) => ({
    ...d,
    fundamentals: fundamentalsByTicker.get(d.ticker) ?? null,
    prediction: predictionByTicker.get(d.ticker) ?? null,
    news: newsByTicker.get(d.ticker) ?? null,
  }))

  const { data: news } = await supabase
    .from('news_articles')
    .select('id, source, title, link, published_at')
    .order('published_at', { ascending: false })
    .limit(20)

  const newsIds = (news ?? []).map((n) => n.id)
  const { data: sentimentRows } = newsIds.length
    ? await supabase
        .from('sentiment_scores')
        .select('source_id, ticker, sentiment, confidence, summary')
        .in('source_id', newsIds)
    : { data: [] as never[] }

  const sentimentByArticle = new Map((sentimentRows ?? []).map((s) => [s.source_id, s]))
  const newsWithSentiment = (news ?? []).map((n) => ({
    ...n,
    sentiment: sentimentByArticle.get(n.id) ?? null,
  }))

  const trackRecord = await loadTrackRecord(supabase)

  return NextResponse.json({
    digestDate,
    digest: digestWithFundamentals,
    news: newsWithSentiment,
    trackRecord,
    availableDates,
  })
}

// Real accountability numbers — every prediction the digest ever recorded,
// evaluated against what the price actually did. Backed by predictions.ts /
// evaluate_predictions.ts, not asserted anywhere.
async function loadTrackRecord(supabase: ReturnType<typeof getServiceSupabase>) {
  const { data: evaluatedPredictions } = await supabase
    .from('predictions')
    .select('signal, outcome')
    .eq('evaluated', true)

  const rows = evaluatedPredictions ?? []
  const total = rows.length
  const correct = rows.filter((r) => r.outcome === 'correct').length
  const accuracyPct = total > 0 ? Math.round((correct / total) * 1000) / 10 : null

  const { data: latestBacktest } = await supabase
    .from('backtest_runs')
    .select('run_at, target_days, total_signals, overall_accuracy_pct, bullish_correct, bullish_total, bearish_correct, bearish_total, neutral_correct, neutral_total')
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    live: { total, correct, accuracyPct },
    backtest: latestBacktest ?? null,
  }
}
