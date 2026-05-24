import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai/router'

const SECTION_SCHEMA: Record<string, object> = {
  hero:         { headline: 'string', subtext: 'string', cta: 'string' },
  about:        { title: 'string', body: 'string' },
  features:     { title: 'string', items: ['item 1', 'item 2', 'item 3', 'item 4', 'item 5', 'item 6'] },
  menu:         { title: 'string', categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4'] },
  gallery:      { title: 'string' },
  testimonials: { title: 'string' },
  contact:      { title: 'string', email: 'string' },
  hours:        { weekdays: 'Mon–Sat: 9:00 AM – 8:00 PM', weekends: 'Sunday: 10:00 AM – 6:00 PM', address: 'string', phone: 'string' },
  cta:          { headline: 'string', subtext: 'string', cta: 'string' },
  team:         { title: 'string' },
  pricing:      { title: 'string' },
  stats:        { stats: ['stat 1', 'stat 2', 'stat 3', 'stat 4'] },
  faq:          { title: 'string' },
  blog:         { title: 'string' },
}

export async function POST(req: NextRequest) {
  const { businessName, template, prompt, sections } = await req.json().catch(() => ({})) as {
    businessName?: string; template?: string; prompt?: string; sections?: string[]
  }

  if (!businessName || !sections?.length) {
    return NextResponse.json({ success: false, error: 'businessName and sections required' }, { status: 400 })
  }

  const sectionSchemas = sections
    .filter(s => SECTION_SCHEMA[s])
    .map(s => `"${s}": ${JSON.stringify(SECTION_SCHEMA[s])}`)
    .join(',\n  ')

  const systemPrompt = `You are a professional copywriter for Indian local businesses.
Write compelling, authentic, action-oriented website copy in English.
CRITICAL: Respond with ONLY a valid JSON object. No markdown. No explanation. No code fences.
The JSON must use EXACTLY the section keys provided. Arrays must remain arrays.`

  const userPrompt = `Business name: "${businessName}"
Business type: ${template ?? 'general'}
${prompt ? `Additional context: ${prompt}` : ''}

Generate website copy as a single JSON object with these EXACT keys and structure:
{
  ${sectionSchemas}
}

Rules:
- "headline" should be punchy (4-8 words), NOT start with "${businessName}"
- "body" / "subtext" should be 1-2 sentences, warm and specific
- "cta" buttons: action verbs like "Book Now", "Order Today", "Get Started"
- "items" arrays: keep same length as shown, each item under 5 words
- "categories" arrays: keep same length, relevant to this business type
- "stats" arrays: use numbers like "500+ Customers", "10 Years Experience"
- Replace all placeholder/generic text with content specific to "${businessName}"
Return ONLY the JSON object.`

  try {
    const raw = await callAI(systemPrompt, userPrompt, 2048, 'website-builder')

    // Strip any markdown fences Groq might add
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Extract JSON object even if there's preamble text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and normalize: only return keys that match requested sections
    const result: Record<string, unknown> = {}
    for (const sectionType of sections) {
      if (parsed[sectionType]) {
        result[sectionType] = parsed[sectionType]
      }
    }

    if (!Object.keys(result).length) {
      throw new Error('AI returned no matching sections')
    }

    return NextResponse.json({ success: true, sections: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    console.error('[ai-copy]', message)
    return NextResponse.json({ success: false, error: message }, { status: 503 })
  }
}
