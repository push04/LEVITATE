/**
 * AI Router — Levitate Labs
 * Priority 1: Primary AI (FREE, no GPU, instant) — PRIMARY
 * Priority 2: Google Gemini Flash (FREE, 1,500 req/day, no GPU) — FALLBACK
 * Priority 3: HuggingFace Inference API (FREE, ~1000 req/day) — FALLBACK
 * Priority 4: Kaggle GPU (FREE, needs notebook running) — OPTIONAL
 * ZERO paid API. ZERO GPU required. Runs fully serverless.
 */

interface AICallOptions {
  system: string
  user: string
  maxTokens?: number
  agentName?: string
  temperature?: number
}

interface Provider {
  name: string
  call: (options: AICallOptions) => Promise<string>
  available: () => boolean
}

// ── Primary Provider ───────────────
// Add to Cloud Provider env var: PRIMARY_API_KEY
function makeGroqProvider(): Provider {
  return {
    name: 'groq-llama70b',
    available: () => !!process.env.GROQ_API_KEY,
    call: async (opts) => {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user }
          ],
          max_tokens: opts.maxTokens ?? 2000,
          temperature: opts.temperature ?? 0.7
        }),
        signal: AbortSignal.timeout(30000)
      })
      if (!res.ok) throw new Error(`Groq error: ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }
  }
}

// ── Google Gemini Flash (FREE, 1,500 req/day, no GPU) ─────────────────
// Sign up free at aistudio.google.com → Get API key
// Add to Cloud Provider env var: GEMINI_API_KEY
function makeGeminiProvider(): Provider {
  return {
    name: 'gemini-flash',
    available: () => !!process.env.GEMINI_API_KEY,
    call: async (opts) => {
      const key = process.env.GEMINI_API_KEY!
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${opts.system}\n\n${opts.user}` }] }
            ],
            generationConfig: {
              maxOutputTokens: opts.maxTokens ?? 2000,
              temperature: opts.temperature ?? 0.7
            }
          }),
          signal: AbortSignal.timeout(30000)
        }
      )
      if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }
  }
}

// ── HuggingFace Inference API (FREE, ~1000 req/day, no GPU) ───────────
// Sign up free at huggingface.co → Settings → Tokens → New token (read)
// Add to Cloud Provider env var: HF_TOKEN
function makeHuggingFaceProvider(): Provider {
  return {
    name: 'huggingface-qwen',
    available: () => !!process.env.HF_TOKEN,
    call: async (opts) => {
      const model = 'Qwen/Qwen2.5-3B-Instruct'
      const res = await fetch(
        `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: opts.system },
              { role: 'user', content: opts.user }
            ],
            max_tokens: Math.min(opts.maxTokens ?? 2000, 2048),
            temperature: opts.temperature ?? 0.7,
            stream: false
          }),
          signal: AbortSignal.timeout(45000)
        }
      )
      if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }
  }
}

// ── Kaggle GPU (optional, needs notebook running manually) ────────────
// Only used if GEMMA_API_URL is set (Kaggle watchdog updates this)
function makeKaggleProvider(): Provider {
  return {
    name: 'kaggle-gpu',
    available: () => !!process.env.GEMMA_API_URL,
    call: async (opts) => {
      const url = process.env.GEMMA_API_URL!
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user }
          ],
          max_tokens: opts.maxTokens ?? 2000,
          temperature: opts.temperature ?? 0.7,
          stream: false
        }),
        signal: AbortSignal.timeout(60000)
      })
      if (!res.ok) throw new Error(`Kaggle error: ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }
  }
}

// ── AI Router ─────────────────────────────────────────────────────────
class AIRouter {
  private providers: Provider[]

  constructor() {
    this.providers = [
      makeGroqProvider(),       // PRIMARY — free, fast, no GPU, 14400/day
      makeGeminiProvider(),     // FALLBACK — free, no GPU, 1500/day
      makeHuggingFaceProvider(), // FALLBACK — free, no GPU, 1000/day
      makeKaggleProvider()      // OPTIONAL — free GPU, only when notebook running
    ]
  }

  async call(opts: AICallOptions): Promise<string> {
    const errors: string[] = []

    for (const provider of this.providers) {
      if (!provider.available()) {
        errors.push(`${provider.name}: not configured`)
        continue
      }

      try {
        const result = await provider.call(opts)
        if (result) {
          this.logProviderUsage(provider.name, opts.agentName).catch(() => {})
          return result
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${provider.name}: ${msg}`)
        console.warn(`[AIRouter] ${provider.name} failed:`, msg)
      }
    }

    throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
  }

  private async logProviderUsage(provider: string, agentName?: string) {
    try {
      const { getServiceSupabase } = await import('@/lib/supabase')
      const supabase = getServiceSupabase()
      await supabase.from('agent_logs').insert({
        agent_name: agentName ?? 'router',
        action: 'ai_call',
        ai_provider: provider,
        status: 'success',
        output: { provider }
      })
    } catch { /* ignore */ }
  }

  extractJSON(text: string): unknown {
    try {
      return JSON.parse(text)
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/)
      if (match) {
        try { return JSON.parse(match[1] ?? match[0]) } catch { /* fall through */ }
      }
      throw new Error('Could not extract JSON from AI response')
    }
  }
}

export const aiRouter = new AIRouter()

export async function callAI(system: string, user: string, maxTokens = 2000, agentName?: string): Promise<string> {
  return aiRouter.call({ system, user, maxTokens, agentName })
}
