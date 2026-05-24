import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'

const THEME_IDS = ['espresso','ocean','forest','rose','slate','golden','violet','midnight','terracotta','sage']

export async function POST(req: NextRequest) {
  const { businessName, template, prompt } = await req.json().catch(() => ({})) as {
    businessName?: string; template?: string; prompt?: string
  }

  const systemPrompt = `You are a professional UI/UX designer specializing in brand identity for Indian businesses.
Based on the business description, recommend color themes. Respond ONLY with valid JSON, no markdown, no extra text.`

  const userPrompt = `Business: "${businessName ?? 'Unknown'}"
Type: ${template ?? 'general'}
Description: ${prompt ?? 'A modern Indian business'}

Available themes: ${THEME_IDS.join(', ')}

Recommend exactly 3 theme IDs with brief reasons why each suits this business.
Return ONLY a JSON array, no explanation:
[
  { "themeId": "espresso", "reason": "..." },
  { "themeId": "ocean", "reason": "..." },
  { "themeId": "forest", "reason": "..." }
]`

  try {
    const result = await callAI(systemPrompt, userPrompt, 512, 'website-builder')
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const suggestions = JSON.parse(cleaned)
    const valid = Array.isArray(suggestions)
      ? suggestions.filter((s: { themeId?: string }) => THEME_IDS.includes(s.themeId ?? '')).slice(0, 3)
      : []
    if (valid.length) {
      return NextResponse.json({ success: true, suggestions: valid })
    }
    // AI gave valid JSON but wrong theme IDs — fall through to fallback
    throw new Error('No valid theme IDs in response')
  } catch (err) {
    console.warn('[ai-theme] falling back to heuristic:', err instanceof Error ? err.message : err)
    const fallback = pickFallbackThemes(template ?? '')
    return NextResponse.json({ success: true, suggestions: fallback })
  }
}

function pickFallbackThemes(template: string): { themeId: string; reason: string }[] {
  const map: Record<string, string[]> = {
    cafe:        ['espresso', 'golden', 'terracotta'],
    restaurant:  ['terracotta', 'golden', 'rose'],
    hotel:       ['espresso', 'golden', 'terracotta'],
    gym:         ['midnight', 'slate', 'forest'],
    clinic:      ['ocean', 'slate', 'forest'],
    hospital:    ['ocean', 'forest', 'slate'],
    salon:       ['rose', 'sage', 'golden'],
    school:      ['golden', 'ocean', 'forest'],
    lawyer:      ['midnight', 'slate', 'espresso'],
    ecommerce:   ['midnight', 'violet', 'ocean'],
    fashion:     ['rose', 'midnight', 'violet'],
    wedding:     ['rose', 'golden', 'espresso'],
    realestate:  ['slate', 'midnight', 'golden'],
    travel:      ['ocean', 'forest', 'sage'],
    agency:      ['midnight', 'violet', 'slate'],
  }
  const themes = map[template] ?? ['espresso', 'ocean', 'forest']
  const reasons = ['Great fit for this business category', 'Recommended for your target audience', 'Creates strong brand recall']
  return themes.map((id, i) => ({ themeId: id, reason: reasons[i] }))
}
