import type { SupabaseClient } from '@supabase/supabase-js'

export type TickerNewsItem = {
  title: string
  link: string | null
  source: string | null
  sentiment: string
  confidence: number
  summary: string
  publishedAt: string | null
}

const ITEMS_PER_TICKER = 3

// The "why" behind a stock's sentiment tag: sentiment_score.ts already runs
// each headline through Groq and writes a condensed, ticker-specific summary
// (not just the raw title) - this surfaces that directly on each stock's
// card instead of only showing it in the separate, unfiltered news feed.
export async function loadTickerNews(supabase: SupabaseClient, tickers: string[]): Promise<Map<string, TickerNewsItem[]>> {
  if (tickers.length === 0) return new Map()

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: sentimentRows } = await supabase
    .from('sentiment_scores')
    .select('ticker, source_id, sentiment, confidence, summary, scored_at')
    .eq('source_type', 'news')
    .in('ticker', tickers)
    .gte('scored_at', since)
    .order('scored_at', { ascending: false })

  const articleIds = [...new Set((sentimentRows ?? []).map((r) => r.source_id as string))]
  const { data: articles } = articleIds.length
    ? await supabase.from('news_articles').select('id, source, title, link, published_at').in('id', articleIds)
    : { data: [] as Array<{ id: string; source: string; title: string; link: string; published_at: string | null }> }
  const articleById = new Map((articles ?? []).map((a) => [a.id, a]))

  const byTicker = new Map<string, TickerNewsItem[]>()
  for (const row of sentimentRows ?? []) {
    const ticker = row.ticker as string
    const list = byTicker.get(ticker) ?? []
    if (list.length >= ITEMS_PER_TICKER) continue
    const article = articleById.get(row.source_id as string)
    list.push({
      title: article?.title ?? (row.summary as string),
      link: article?.link ?? null,
      source: article?.source ?? null,
      sentiment: row.sentiment as string,
      confidence: row.confidence as number,
      summary: row.summary as string,
      publishedAt: article?.published_at ?? (row.scored_at as string),
    })
    byTicker.set(ticker, list)
  }
  return byTicker
}
