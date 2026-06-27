import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { aiRouter } from '@/lib/ai/router'

const SYSTEM_PROMPT = `You are a contact extraction assistant. Extract phone numbers and names from any text input (WhatsApp exports, spreadsheet pastes, emails, notes, etc.).

Rules:
- Extract every phone number you find, with the associated name if available
- Normalize numbers to international format (add 91 for Indian 10-digit numbers)
- Keep +/country code if already present
- If no name is found for a number, leave name as empty string
- Skip duplicates (keep first occurrence)
- Return ONLY valid JSON, no explanation

Output format:
{"contacts": [{"phone": "919999999999", "name": "Rahul Sharma"}, {"phone": "917788990011", "name": ""}]}`

export async function POST(req: NextRequest) {
  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { text: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text } = body
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })
  if (text.length > 50_000) return NextResponse.json({ error: 'Text too long (max 50,000 chars)' }, { status: 400 })

  try {
    const raw = await aiRouter.call({
      system: SYSTEM_PROMPT,
      user: text.slice(0, 20_000),
      maxTokens: 4000,
      temperature: 0.1,
      agentName: 'whatsapp-number-extractor',
    })

    const parsed = aiRouter.extractJSON(raw) as { contacts?: { phone: string; name: string }[] }
    const contacts = parsed?.contacts

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: 'AI returned unexpected format', raw: raw.slice(0, 200) }, { status: 500 })
    }

    // Validate and deduplicate
    const seen = new Set<string>()
    const valid: { phone: string; name: string }[] = []
    for (const c of contacts) {
      const phone = String(c.phone ?? '').replace(/[^0-9]/g, '')
      if (phone.length >= 10 && phone.length <= 15 && !seen.has(phone)) {
        seen.add(phone)
        valid.push({ phone, name: String(c.name ?? '').trim() })
      }
    }

    return NextResponse.json({ contacts: valid, total: valid.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[extract-numbers] AI error:', msg)
    return NextResponse.json({ error: `AI extraction failed: ${msg}` }, { status: 500 })
  }
}
