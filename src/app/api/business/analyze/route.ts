import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

interface DataStats {
  validPhones: number
  invalidPhones: number
  duplicatePhones: number
  topCities: [string, number][]
  topCategories: [string, number][]
  columnCompleteness: { column: string; filled: number; pct: number }[]
}

function cleanText(s: string): string {
  return s
    .replace(/—/g, '-').replace(/–/g, '-')
    .replace(/→/g, 'to').replace(/←/g, 'from')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function cleanArr(arr: unknown[]): string[] {
  return arr.map(item => {
    const s = typeof item === 'string' ? item
      : typeof item === 'object' && item !== null ? Object.values(item).join(' - ')
      : String(item)
    return cleanText(s)
  })
}

export async function GET() {
  let ctx: Awaited<ReturnType<typeof getBusinessApiContext>>
  try {
    ctx = await getBusinessApiContext()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('company_ai_analyses')
    .select('id,file_name,total_rows,valid_phones,executive_summary,key_findings,recommendations,data_quality,user_question,created_at')
    .eq('company_id', ctx.portal.companyId)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ analyses: data ?? [] })
}

export async function POST(req: NextRequest) {
  let ctx: Awaited<ReturnType<typeof getBusinessApiContext>>
  try {
    ctx = await getBusinessApiContext()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'Active subscription required' || msg.includes('feature is not enabled')) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    fileName: string
    totalRows: number
    headers: string[]
    stats: DataStats
    sampleRows: Record<string, string>[]
    userQuestion?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fileName, totalRows, headers, stats, sampleRows, userQuestion } = body
  if (!fileName || !totalRows || !headers?.length || !stats) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const cityLines = stats.topCities.slice(0, 10).map(([c, n]) => `  ${c}: ${n}`).join('\n')
  const catLines = stats.topCategories.slice(0, 8).map(([c, n]) => `  ${c}: ${n}`).join('\n')
  const incompleteCols = stats.columnCompleteness
    .filter(c => c.pct < 90)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6)
    .map(c => `  ${c.column}: ${c.pct}% filled`)
    .join('\n')
  const sampleText = (sampleRows ?? []).slice(0, 8).map((row, i) =>
    `Row ${i + 1}: ` + headers.slice(0, 8).map(h => `${h}=${row[h] ?? ''}`).join(' | ')
  ).join('\n')

  const focus = userQuestion?.trim() ? `\nFocus: ${userQuestion.trim()}` : ''

  const system = 'You are a senior business data analyst. Respond ONLY with valid JSON. No markdown, no extra text.'
  const prompt = [
    `Dataset: "${fileName}" — ${totalRows.toLocaleString()} rows, ${headers.length} columns`,
    `Columns: ${headers.join(', ')}`,
    `Phone data: ${stats.validPhones} valid, ${stats.invalidPhones} invalid, ${stats.duplicatePhones} duplicates`,
    stats.topCities.length ? `City distribution:\n${cityLines}` : '',
    stats.topCategories.length ? `Category distribution:\n${catLines}` : '',
    incompleteCols ? `Incomplete columns:\n${incompleteCols}` : '',
    sampleText ? `Sample rows:\n${sampleText}` : '',
    focus,
    `Return JSON: {"executiveSummary":"...","keyFindings":["...","...","..."],"recommendations":["...","...","..."],"dataQuality":"..."}`,
    `Keep each item under 25 words. Plain text only — no dashes at start, no arrows, no special characters.`,
  ].filter(Boolean).join('\n\n')

  try {
    const raw = await callAI(system, prompt, 600, 'data-analyzer')
    let parsed: Record<string, unknown>
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : raw)
    } catch {
      parsed = {
        executiveSummary: cleanText(raw.slice(0, 400)),
        keyFindings: [],
        recommendations: [],
        dataQuality: 'Could not parse AI response',
      }
    }

    const insights = {
      executiveSummary: cleanText(String(parsed.executiveSummary ?? '')),
      keyFindings: cleanArr((parsed.keyFindings as unknown[]) ?? []),
      recommendations: cleanArr((parsed.recommendations as unknown[]) ?? []),
      dataQuality: cleanText(String(parsed.dataQuality ?? '')),
      metrics: { totalRows, columnsAnalyzed: headers.length },
    }

    let analysisId: string | undefined
    try {
      const supabase = getServiceSupabase()
      const { data: saved } = await supabase
        .from('company_ai_analyses')
        .insert({
          company_id: ctx.portal.companyId,
          file_name: fileName,
          total_rows: totalRows,
          valid_phones: stats.validPhones,
          user_question: userQuestion ?? null,
          executive_summary: insights.executiveSummary,
          key_findings: insights.keyFindings,
          recommendations: insights.recommendations,
          data_quality: insights.dataQuality,
          stats: {
            validPhones: stats.validPhones,
            invalidPhones: stats.invalidPhones,
            duplicatePhones: stats.duplicatePhones,
            topCities: stats.topCities.slice(0, 15),
            topCategories: stats.topCategories.slice(0, 10),
          },
        })
        .select('id')
        .single()
      analysisId = saved?.id
    } catch (saveErr) {
      console.error('[Analyze] DB save failed:', saveErr)
    }

    return NextResponse.json({ insights, analysisId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes('rate limit') || msg.includes('429') || msg.includes('RPM') ||
      msg.includes('rate limited') || msg.includes('quota') || msg.includes('All AI providers')
    ) {
      return NextResponse.json({ error: 'Rate limit — please wait 30 seconds and retry', retryAfter: 30 }, { status: 429 })
    }
    return NextResponse.json({ error: 'AI failed', detail: msg.slice(0, 200) }, { status: 500 })
  }
}
