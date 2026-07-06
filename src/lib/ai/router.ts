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
 * Checked directly against Groq's API (response rate-limit headers), not
 * assumed: on this account, only llama-3.1-8b-instant actually has the
 * generous 14,400 req/day free-tier limit. llama-3.3-70b-versatile,
 * openai/gpt-oss-20b, and meta-llama/llama-4-scout-17b-16e-instruct are all
 * capped at just 1,000/day here despite Groq's docs describing per-model
 * pools, and gemma2-9b-it has been fully decommissioned by Groq (confirmed
 * via a live API call returning "model has been decommissioned"). A
 * fallback chain built on those doesn't add real capacity - it just burns
 * through a 1,000/day budget fast (or fails outright on the decommissioned
 * one) and ends up back on rate limits, so there is no real fallback here,
 * just the one model that is actually reliable at this call volume.
 */
const GROQ_MODELS = ['llama-3.1-8b-instant']

function makeGroqProvider(): Provider {
  return {
    name: 'groq',
    available: () => !!process.env.GROQ_API_KEY,
    call: async (opts) => {
      const key = process.env.GROQ_API_KEY!
      const errors: string[] = []

      for (const model of GROQ_MODELS) {
        // With only one model in the chain, a 429 is the per-minute (not
        // per-day) window - waiting on Groq's own retry-after and retrying
        // the same model recovers it, instead of immediately giving up.
        for (let attempt = 1; attempt <= 3; attempt++) {
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
            if (attempt < 3) {
              const retryAfterSec = Number(res.headers.get('retry-after')) || attempt * 5
              console.warn(`[AIRouter] Groq/${model} rate limited, waiting ${retryAfterSec}s before retry ${attempt}/2`)
              await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000))
              continue
            }
            errors.push(`${model}: RPM limit hit after retries`)
            break
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
          break
        }
      }

      throw new Error(`Groq rate limited: ${errors.join(' | ')}`)
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
