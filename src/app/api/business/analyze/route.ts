import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'

const CONTEXT_LIMIT = 3000 // chars of previousInsights to send

function rowsToText(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.join(' | ')]
  for (const row of rows) {
    lines.push(headers.map(h => String(row[h] ?? '')).join(' | '))
  }
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    await getBusinessApiContext()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'Active subscription required' || msg.includes('feature is not enabled')) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    company_id?: string
    fileName: string
    headers: string[]
    rows: Record<string, string>[]
    chunkIndex: number
    totalChunks: number
    totalRows: number
    userQuestion?: string
    previousInsights?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fileName, headers, rows, chunkIndex, totalChunks, totalRows, userQuestion, previousInsights } = body

  if (!headers?.length || !rows || chunkIndex === undefined || !totalChunks) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const isFinal = chunkIndex === totalChunks - 1
  const dataText = rowsToText(headers, rows.slice(0, 50))
  const prevCtx = previousInsights ? previousInsights.slice(-CONTEXT_LIMIT) : ''
  const startRow = chunkIndex * rows.length + 1
  const endRow = Math.min((chunkIndex + 1) * rows.length, totalRows)
  const focus = userQuestion?.trim() ? `Focus: ${userQuestion.trim()}` : ''

  const system = isFinal
    ? 'You are a senior business data analyst. Respond ONLY with valid JSON — no markdown, no extra text.'
    : 'You are a business data analyst. Respond ONLY with valid JSON — no markdown, no extra text.'

  const userPrompt = isFinal
    ? [
        `Final analysis of "${fileName}" — ${totalRows} rows, ${totalChunks} chunks.`,
        `Columns: ${headers.join(', ')}`,
        `Last chunk (rows ${startRow}–${endRow}):\n${dataText}`,
        prevCtx ? `All chunk insights so far:\n${prevCtx}` : '',
        focus,
        `Return JSON: {"executiveSummary":"...","keyFindings":["..."],"recommendations":["..."],"dataQuality":"...","metrics":{"totalRows":${totalRows},"columnsAnalyzed":${headers.length}}}`,
      ].filter(Boolean).join('\n\n')
    : [
        `Chunk ${chunkIndex + 1}/${totalChunks} of "${fileName}" (${totalRows} total rows). Rows ${startRow}–${endRow}.`,
        `Columns: ${headers.join(', ')}`,
        `Data:\n${dataText}`,
        prevCtx ? `Previous chunks context:\n${prevCtx}` : '',
        focus,
        `Return JSON: {"chunkSummary":"2-3 key observations","notableItems":["item1","item2"]}`,
      ].filter(Boolean).join('\n\n')

  try {
    const raw = await callAI(system, userPrompt, isFinal ? 700 : 350, 'data-analyzer')
    let insights: Record<string, unknown>
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      insights = JSON.parse(match ? match[0] : raw)
    } catch {
      insights = isFinal
        ? { executiveSummary: raw.slice(0, 500), keyFindings: [], recommendations: [], dataQuality: '', metrics: { totalRows, columnsAnalyzed: headers.length } }
        : { chunkSummary: raw.slice(0, 300), notableItems: [] }
    }
    return NextResponse.json({ insights, isFinal, chunkIndex })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('RPM')) {
      return NextResponse.json({ error: 'Rate limit', retryAfter: 5 }, { status: 429 })
    }
    return NextResponse.json({ error: 'AI failed', detail: msg.slice(0, 200) }, { status: 500 })
  }
}
