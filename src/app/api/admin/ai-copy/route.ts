import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'

export async function POST(req: NextRequest) {
  const { businessName, template, prompt, sections } = await req.json().catch(() => ({})) as {
    businessName?: string; template?: string; prompt?: string; sections?: string[]
  }

  if (!businessName || !sections?.length) {
    return NextResponse.json({ success: false, error: 'businessName and sections required' }, { status: 400 })
  }

  const systemPrompt = `You are a professional copywriter specializing in local businesses in India.
Generate compelling, authentic website copy that is warm, professional, and action-oriented.
Respond ONLY with a valid JSON object, no markdown, no explanation.`

  const userPrompt = `Business: "${businessName}"
Template type: ${template ?? 'generic'}
Context: ${prompt ?? 'A local Indian business'}
Sections needed: ${sections.join(', ')}

Generate JSON with a key for each section type, each containing relevant content fields.
Example format:
{
  "hero": { "headline": "...", "subtext": "...", "cta": "..." },
  "about": { "title": "...", "body": "..." },
  "features": { "title": "...", "items": ["...", "...", "..."] }
}`

  try {
    const result = await callAI(systemPrompt, userPrompt, 2048, 'website-builder')
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const json = JSON.parse(cleaned)
    return NextResponse.json({ success: true, sections: json })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    console.error('[ai-copy]', message)
    return NextResponse.json({ success: false, error: message }, { status: 503 })
  }
}
