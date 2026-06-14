import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

interface NumericStat { min: number; max: number; mean: number; sum: number; count: number }

interface DataStats {
  validPhones: number
  invalidPhones: number
  duplicatePhones: number
  topCities: [string, number][]
  topCategories: [string, number][]
  columnCompleteness: { column: string; filled: number; pct: number }[]
  columnTypes: Record<string, string>
  numericStats: Record<string, NumericStat>
  categoricalDistributions: Record<string, [string, number][]>
  dateRange: { column: string; earliest: string; latest: string } | null
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

  const { fileName, totalRows, headers: rawHeaders, stats, sampleRows, userQuestion } = body
  if (!fileName || !totalRows || !rawHeaders?.length || !stats) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Strip Excel artifact empty columns
  const headers = rawHeaders.filter(h => h && h.trim() && !h.startsWith('__EMPTY') && !h.startsWith('_EMPTY'))

  const pct = (n: number) => `${((n / totalRows) * 100).toFixed(1)}%`

  // Build verified stats block — AI must treat these as ground truth
  const parts: string[] = []

  parts.push(`DATASET: "${fileName}" — ${totalRows.toLocaleString()} rows, ${headers.length} columns`)
  parts.push(`Column types: ${headers.map(h => `${h}(${stats.columnTypes?.[h] ?? 'text'})`).join(', ')}`)

  // Phone stats
  if (stats.validPhones > 0 || stats.invalidPhones > 0) {
    parts.push(
      `PHONE COVERAGE (verified from all ${totalRows.toLocaleString()} rows):\n` +
      `  Valid unique numbers: ${stats.validPhones.toLocaleString()} (${pct(stats.validPhones)})\n` +
      `  Invalid numbers: ${stats.invalidPhones}\n` +
      `  Duplicates removed: ${stats.duplicatePhones}`
    )
  }

  // City distribution
  if (stats.topCities.length) {
    const cityTotal = stats.topCities.reduce((s, [, n]) => s + n, 0)
    parts.push(
      `CITY DISTRIBUTION (all ${totalRows.toLocaleString()} rows):\n` +
      stats.topCities.slice(0, 12).map(([c, n]) => `  ${c}: ${n} (${pct(n)})`).join('\n') +
      (stats.topCities.length > 12 ? `\n  ...${stats.topCities.length - 12} more cities` : '') +
      `\n  Total rows with city: ${cityTotal.toLocaleString()}`
    )
  }

  // Category distribution
  if (stats.topCategories.length) {
    parts.push(
      `CATEGORY DISTRIBUTION (all ${totalRows.toLocaleString()} rows):\n` +
      stats.topCategories.slice(0, 10).map(([c, n]) => `  ${c}: ${n} (${pct(n)})`).join('\n')
    )
  }

  // Other categorical columns (status, stage, etc.)
  const catDist = stats.categoricalDistributions ?? {}
  const extraCatCols = Object.keys(catDist).filter(h =>
    !stats.topCategories.length || !headers.some(hh => hh === h && stats.columnTypes?.[hh] === 'category')
  ).slice(0, 3)
  for (const col of extraCatCols) {
    const dist = catDist[col]
    if (dist?.length) {
      parts.push(
        `"${col}" DISTRIBUTION:\n` +
        dist.slice(0, 10).map(([v, n]) => `  ${v}: ${n} (${pct(n)})`).join('\n')
      )
    }
  }

  // Numeric column stats
  const numStats = stats.numericStats ?? {}
  const numCols = Object.keys(numStats).slice(0, 4)
  if (numCols.length) {
    const numLines = numCols.map(col => {
      const s = numStats[col]
      return `  "${col}": sum=${s.sum.toLocaleString()}, mean=${s.mean.toLocaleString()}, min=${s.min.toLocaleString()}, max=${s.max.toLocaleString()}, filled=${s.count.toLocaleString()} rows`
    })
    parts.push(`NUMERIC COLUMNS:\n${numLines.join('\n')}`)
  }

  // Date range
  if (stats.dateRange) {
    parts.push(`DATE RANGE ("${stats.dateRange.column}"): ${stats.dateRange.earliest} to ${stats.dateRange.latest}`)
  }

  // Data completeness — show incomplete real columns only (skip Excel empty artifacts)
  const incomplete = stats.columnCompleteness
    .filter(c => c.pct < 95 && c.column && !c.column.startsWith('__EMPTY') && !c.column.startsWith('_EMPTY') && c.column.trim())
    .sort((a, b) => a.pct - b.pct).slice(0, 8)
  if (incomplete.length) {
    parts.push(
      `DATA COMPLETENESS (incomplete columns only):\n` +
      incomplete.map(c => `  ${c.column}: ${c.pct}% (${c.filled.toLocaleString()} of ${totalRows.toLocaleString()} rows filled)`).join('\n')
    )
  }

  // Stratified sample — only real columns
  const sample = (sampleRows ?? []).slice(0, 20)
  if (sample.length) {
    const sampleLines = sample.map((row, i) =>
      `  [${i + 1}] ` + headers.slice(0, 10).map(h => `${h}: ${row[h]?.trim() || '-'}`).join(' | ')
    )
    parts.push(`REPRESENTATIVE SAMPLE (${sample.length} rows, one from each major group):\n${sampleLines.join('\n')}`)
  }

  const focus = userQuestion?.trim() ? `FOCUS QUESTION: ${userQuestion.trim()}` : ''
  if (focus) parts.push(focus)

  parts.push(
    `TASK: Based ONLY on the verified statistics above, return this exact JSON:\n` +
    `{"executiveSummary":"...","keyFindings":["...","...","..."],"recommendations":["...","...","..."],"dataQuality":"..."}\n` +
    `Rules:\n` +
    `- Every number you state must come from VERIFIED STATISTICS above — do not estimate, round differently, or invent\n` +
    `- If something is not in the stats, do not mention it\n` +
    `- Keep each keyFinding and recommendation under 25 words\n` +
    `- Plain text only — no dashes at line start, no arrows, no markdown`
  )

  const system = 'You are a senior business data analyst. Respond ONLY with valid JSON matching the requested structure. No markdown, no extra text outside the JSON.'
  const prompt = parts.join('\n\n')

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
