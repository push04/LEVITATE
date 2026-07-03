import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { callAI, aiRouter } from '@/lib/ai/router'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['civil_works', 'supply', 'services', 'it', 'mining', 'health', 'education', 'other']

// "AI-based filtering" — turn a freeform query ("construction tenders in
// Gaya due this week above 5 lakh") into structured filters the page
// applies against the already-loaded tender list, using the same
// Groq-first/Gemini/HuggingFace fallback chain as the rest of the app.
export async function POST(request: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await request.json().catch(() => ({ query: '' }))
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  try {
    const raw = await callAI(
      `Extract structured search filters from a government tender search query. Respond with strict JSON only, no prose: ` +
        `{"categories": string[] (only from: ${CATEGORIES.join(', ')}), "districts": string[], "states": string[] (Bihar/Jharkhand/Central), ` +
        `"keywords": string[], "min_value": number|null, "max_value": number|null, "urgent_only": boolean, ` +
        `"summary": string (one short phrase describing what you understood, e.g. "civil works in Gaya, deadline this week")}. ` +
        `"urgent_only" is true only if the user explicitly asks for urgent/soon/closing-soon tenders. Omit fields you can't infer by leaving arrays empty, numbers null, urgent_only false.`,
      query,
      500,
      'tenderpulse-search'
    )
    const parsed = aiRouter.extractJSON(raw) as Record<string, unknown>
    return NextResponse.json({ filters: parsed })
  } catch (err: any) {
    // Every provider unavailable/failed — the page falls back to plain
    // client-side keyword matching rather than erroring out.
    return NextResponse.json({ filters: null, error: err?.message ?? 'AI parsing unavailable' })
  }
}
