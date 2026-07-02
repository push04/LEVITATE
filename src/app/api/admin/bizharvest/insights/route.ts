import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/auth'
import { getBizharvestAnalytics } from '@/lib/bizharvest-analytics'
import { callAI } from '@/lib/ai/router'

export const dynamic = 'force-dynamic'

const AGENT_NAME = 'bizharvest_insights'
const CACHE_MS = 6 * 60 * 60 * 1000 // 6h — keeps this off the Groq free-tier rate limit on repeat dashboard loads

const SYSTEM_PROMPT = `You are a growth analyst for Levitate Labs, an agentic AI + automation agency serving Indian MSMEs.
You're reviewing BizHarvest, our local lead-scraping pipeline (Google Maps + JustDial) that feeds our sales CRM.
Given the JSON stats below, write a concise operator briefing:
1. A 2-3 sentence summary of scrape health and lead quality.
2. 3-4 short, specific, actionable bullet points (which cities/categories to prioritize or drop, data-quality gaps like missing phones, pipeline bottlenecks, etc).
Keep it under 160 words total. Plain text, no markdown headers, use "-" for bullets.`

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const refresh = req.nextUrl.searchParams.get('refresh') === '1'

  try {
    if (!refresh) {
      const { data: cached } = await supabase
        .from('agent_logs')
        .select('output, created_at')
        .eq('agent_name', AGENT_NAME)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const cachedInsight = (cached?.output as any)?.insight as string | undefined
      if (cachedInsight && Date.now() - new Date(cached!.created_at).getTime() < CACHE_MS) {
        return NextResponse.json({ insight: cachedInsight, cached: true, generatedAt: cached!.created_at })
      }
    }

    const analytics = await getBizharvestAnalytics(supabase)

    if (analytics.summary.total === 0) {
      return NextResponse.json({ insight: 'No BizHarvest leads yet — run a scrape to get insights.', cached: false, generatedAt: new Date().toISOString() })
    }

    const statsForPrompt = {
      totalLeads: analytics.summary.total,
      withPhonePct: analytics.summary.total ? Math.round((analytics.summary.withPhone / analytics.summary.total) * 100) : 0,
      withWebsitePct: analytics.summary.total ? Math.round((analytics.summary.withWebsite / analytics.summary.total) * 100) : 0,
      avgRating: analytics.summary.avgRating,
      citiesCovered: analytics.summary.distinctCities,
      categoriesCovered: analytics.summary.distinctCategories,
      topCities: analytics.topCities.slice(0, 5),
      topCategories: analytics.topCategories.slice(0, 5),
      targetsActive: analytics.targets.active,
      targetsCovered: analytics.targets.covered,
      pipeline: analytics.pipeline,
      last14DayTrend: analytics.trend,
    }

    let insight: string
    try {
      insight = (await callAI(SYSTEM_PROMPT, JSON.stringify(statsForPrompt), 400, AGENT_NAME)).trim()
    } catch (err: any) {
      console.error('[bizharvest insights] AI generation failed:', err?.message ?? err)
      return NextResponse.json({ error: 'AI insight generation unavailable right now' }, { status: 502 })
    }

    await supabase.from('agent_logs').insert({
      agent_name: AGENT_NAME,
      action: 'generate_insight',
      output: { insight },
      status: 'success',
      ai_provider: 'ai_router',
    })

    return NextResponse.json({ insight, cached: false, generatedAt: new Date().toISOString() })
  } catch (err: any) {
    console.error('[bizharvest insights] unhandled error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
