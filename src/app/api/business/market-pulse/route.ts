import { NextResponse } from 'next/server'
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireBusinessCompany('marketPulse')
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const supabase = getServiceSupabase()

  // Digest is written once a day by the marketpulse scraper — use whatever
  // the most recent digest_date actually is rather than assuming "today"
  // (the scraper may not have run yet, or ran in a different timezone).
  const { data: latestDateRow } = await supabase
    .from('daily_digest')
    .select('digest_date')
    .order('digest_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestDateRow) {
    return NextResponse.json({ digestDate: null, digest: [], news: [] })
  }

  const digestDate = latestDateRow.digest_date as string

  const { data: digest, error: digestError } = await supabase
    .from('daily_digest')
    .select('ticker, company_name, sector, sentiment_trend, avg_confidence, news_count, price_change_pct, rsi_14, trend_signal, divergence_flag, summary_text')
    .eq('digest_date', digestDate)
    .order('divergence_flag', { ascending: false })
    .order('avg_confidence', { ascending: false })

  if (digestError) return NextResponse.json({ error: digestError.message }, { status: 500 })

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

  return NextResponse.json({
    digestDate,
    digest: digest ?? [],
    news: newsWithSentiment,
  })
}
