/**
 * AI Router — Levitate Labs
 * Primary: Gemma 4 running FREE on Kaggle GPU (GEMMA_API_URL env var)
 * Fallback 1: Groq (free tier, 14400 req/day)
 * Fallback 2: OpenRouter free models
 * ZERO paid API usage unless all free tiers exhausted.
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

// ── Kaggle Gemma 4 provider ────────────────────────────────────────────
// Deploy a Kaggle notebook with Gemma 4 + FastAPI + ngrok to get a free endpoint.
// Set GEMMA_API_URL = https://YOUR_NGROK_URL (updated daily by kaggle-watchdog)
function makeKaggleGemmaProvider(): Provider {
  return {
    name: 'kaggle-gemma4',
    available: () => !!process.env.GEMMA_API_URL,
    call: async (opts) => {
      const url = process.env.GEMMA_API_URL!
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.GEMMA_API_KEY ? { Authorization: `Bearer ${process.env.GEMMA_API_KEY}` } : {})
        },
        body: JSON.stringify({
          model: 'gemma-4',
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

      if (!res.ok) throw new Error(`Kaggle Gemma error: ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }
  }
}

// ── Groq provider (free, 14400 req/day) ───────────────────────────────
function makeGroqProvider(): Provider {
  return {
    name: 'groq',
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

// ── OpenRouter free tier (meta-llama/llama-3.1-8b-instruct:free) ──────
function makeOpenRouterProvider(): Provider {
  return {
    name: 'openrouter-free',
    available: () => !!process.env.OPENROUTER_API_KEY,
    call: async (opts) => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://levitatelabs.online',
          'X-Title': 'Levitate Labs'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user }
          ],
          max_tokens: opts.maxTokens ?? 2000,
          temperature: opts.temperature ?? 0.7
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }
  }
}

// ── AI Router ─────────────────────────────────────────────────────────
class AIRouter {
  private providers: Provider[]

  constructor() {
    // Priority: Gemma4 on Kaggle → Groq → OpenRouter free
    this.providers = [
      makeKaggleGemmaProvider(),
      makeGroqProvider(),
      makeOpenRouterProvider()
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
          // Log which provider was used (non-blocking)
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
    // Fire-and-forget logging — doesn't block the AI call
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
    } catch {
      // Ignore logging errors
    }
  }

  // Simple JSON extraction helper used by agents
  extractJSON(text: string): unknown {
    try {
      // Try direct parse first
      return JSON.parse(text)
    } catch {
      // Try to find JSON block in markdown
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/)
      if (match) {
        try { return JSON.parse(match[1] ?? match[0]) } catch { /* fall through */ }
      }
      throw new Error('Could not extract JSON from AI response')
    }
  }
}

// Singleton
export const aiRouter = new AIRouter()

// Convenience export
export async function callAI(system: string, user: string, maxTokens = 2000, agentName?: string): Promise<string> {
  return aiRouter.call({ system, user, maxTokens, agentName })
}
