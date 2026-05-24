import { NextRequest, NextResponse } from 'next/server'
import { generateGoogleAI } from '@/lib/google-ai'

const THEME_IDS = ['espresso','ocean','forest','rose','slate','golden','violet','midnight','terracotta','sage']

export async function POST(req: NextRequest) {
  const { businessName, template, prompt } = await req.json().catch(() => ({})) as {
    businessName?: string; template?: string; prompt?: string
  }

  const systemPrompt = `You are a professional UI/UX designer specializing in brand identity for Indian businesses.
Based on the business description, recommend color themes. Respond ONLY with valid JSON, no markdown.`

  const userPrompt = `Business: "${businessName ?? 'Unknown'}"
Type: ${template ?? 'general'}
Description: ${prompt ?? 'A modern Indian business'}

Available themes: ${THEME_IDS.join(', ')}

Recommend exactly 3 theme IDs with brief reasons why each suits this business.
Format:
[
  { "themeId": "espresso", "reason": "..." },
  { "themeId": "ocean", "reason": "..." },
  { "themeId": "forest", "reason": "..." }
]`

  try {
    const result = await generateGoogleAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    if (!result) throw new Error('AI unavailable')
    const suggestions = JSON.parse(result.replace(/```json|```/g, '').trim())
    const valid = Array.isArray(suggestions)
      ? suggestions.filter((s: { themeId?: string }) => THEME_IDS.includes(s.themeId ?? '')).slice(0, 3)
      : []
    if (!valid.length) throw new Error('No valid themes')
    return NextResponse.json({ success: true, suggestions: valid })
  } catch {
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
