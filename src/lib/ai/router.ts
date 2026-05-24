/**
 * AI Router — Levitate Labs
 *
 * Groq free tier limits (all models share the same quota pool):
 *   RPD: 14,400 requests/day
 *   RPM: 30 requests/minute  ← this is what causes 429s
 *   TPM: varies per model
 *
 * Strategy: try models in order of best quality-for-task.
 * On 429 (RPM hit), rotate to the next model immediately.
 * All models below are free-tier production models on Groq.
 *
 * Fallback chain: Groq → Gemini → HuggingFace → Kaggle
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

/**
 * Groq free-tier production models — all have 14,400 RPD / 30 RPM.
 * Ordered: fastest/lightest first so we exhaust the light model's
 * per-minute window before falling to heavier ones.
 *
 * Model IDs confirmed from https://console.groq.com/docs/models
 */
const GROQ_MODELS = [
  // Best for JSON/structured output — fast, cheap, 128K context
  'llama-3.1-8b-instant',
  // Good quality, longer context, high TPM
  'llama-3.3-70b-versatile',
  // OpenAI GPT-OSS 20B — solid quality, separate quota pool
  'openai/gpt-oss-20b',
  // Google Gemma 2 9B — separate capacity pool on Groq infra
  'gemma2-9b-it',
  // Preview: Llama 4 Scout — may have higher limits as newer model
  'meta-llama/llama-4-scout-17b-16e-instruct',
]

function makeGroqProvider(): Provider {
  return {
    name: 'groq',
    available: () => !!process.env.GROQ_API_KEY,
    call: async (opts) => {
      const key = process.env.GROQ_API_KEY!
      const errors: string[] = []

      for (const model of GROQ_MODELS) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: opts.system },
                { role: 'user', content: opts.user },
              ],
              max_tokens: opts.maxTokens ?? 2000,
              temperature: opts.temperature ?? 0.7,
            }),
            signal: AbortSignal.timeout(30000),
          })

          if (res.status === 429) {
            // Per-minute rate limit on this model — silently try next
            errors.push(`${model}: RPM limit hit`)
            console.warn(`[AIRouter] Groq/${model} rate limited (429), trying next model`)
            continue
          }

          if (!res.ok) {
            const body = await res.text().catch(() => '')
            throw new Error(`Groq/${model} HTTP ${res.status}: ${body.slice(0, 200)}`)
          }

          const data = await res.json()
          const content: string = data.choices?.[0]?.message?.content ?? ''
          if (content) {
            console.log(`[AIRouter] Groq model used: ${model}`)
            return content
          }

          errors.push(`${model}: empty response`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('RPM limit') || msg.includes('429')) {
            errors.push(`${model}: rate limited`)
            continue
          }
          throw err // Non-rate-limit error — don't swallow it
        }
      }

      throw new Error(`All Groq models rate limited: ${errors.join(' | ')}`)
    },
  }
}

// ── Google Gemini Flash (FREE, 1,500 req/day) ─────────────────────────
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
            contents: [{ role: 'user', parts: [{ text: `${opts.system}\n\n${opts.user}` }] }],
            generationConfig: {
              maxOutputTokens: opts.maxTokens ?? 2000,
              temperature: opts.temperature ?? 0.7,
            },
          }),
          signal: AbortSignal.timeout(30000),
        }
      )
      if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    },
  }
}

// ── HuggingFace Inference API (FREE, ~1000 req/day) ───────────────────
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: opts.system },
              { role: 'user', content: opts.user },
            ],
            max_tokens: Math.min(opts.maxTokens ?? 2000, 2048),
            temperature: opts.temperature ?? 0.7,
            stream: false,
          }),
          signal: AbortSignal.timeout(45000),
        }
      )
      if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    },
  }
}

// ── Kaggle GPU (optional, needs notebook running) ─────────────────────
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
            { role: 'user', content: opts.user },
          ],
          max_tokens: opts.maxTokens ?? 2000,
          temperature: opts.temperature ?? 0.7,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) throw new Error(`Kaggle error: ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    },
  }
}

// ── AI Router ─────────────────────────────────────────────────────────
class AIRouter {
  private providers: Provider[]

  constructor() {
    this.providers = [
      makeGroqProvider(),
      makeGeminiProvider(),
      makeHuggingFaceProvider(),
      makeKaggleProvider(),
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
        output: { provider },
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
