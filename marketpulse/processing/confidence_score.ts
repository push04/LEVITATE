import { GROQ_MODELS } from "../groq_models.js";

const CHUNK_SIZE = 25;

export type ConfidenceInput = {
  ticker: string;
  signal: "bullish" | "bearish" | "neutral";
  rsi: number | null;
  priceChangePct: number | null;
  sentimentTrend: string;
  riskLevel: string;
  deterministicConfidence: number;
};

export type ConfidenceResult = { confidence: number; reason: string | null; source: "groq" | "deterministic" };

async function scoreChunkWithGroq(chunk: ConfidenceInput[]): Promise<Map<string, { confidence: number; reason: string }>> {
  const apiKey = process.env.GROQ_API_KEY;
  const result = new Map<string, { confidence: number; reason: string }>();
  if (!apiKey) return result;

  const system = `You are a financial analyst assistant for the Indian stock market. For each stock below, you are given its ALREADY-DECIDED technical signal (bullish/bearish/neutral) plus supporting data - do NOT change or second-guess the signal itself. Your only job is to assign a confidence score from 0-100 for how strong and well-supported that specific signal looks given the data (higher = indicators clearly agree with the signal, lower = borderline or conflicting evidence).

Respond ONLY with a JSON array, no prose: [{"ticker": "RELIANCE", "confidence": 78, "reason": "one short phrase"}]`;

  const lines = chunk
    .map(
      (it) =>
        `${it.ticker}: signal=${it.signal}, rsi=${it.rsi != null ? it.rsi.toFixed(1) : "n/a"}, today_price_change=${it.priceChangePct != null ? it.priceChangePct.toFixed(2) : "n/a"}%, news_sentiment=${it.sentimentTrend}, risk_level=${it.riskLevel}`
    )
    .join("\n");
  const user = `STOCKS:\n${lines}`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 2000,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 429) {
        console.warn(`[confidence_score] ${model} rate limited, trying next model`);
        continue;
      }
      if (!res.ok) {
        console.warn(`[confidence_score] ${model} HTTP ${res.status}, trying next model`);
        continue;
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) {
        console.warn(`[confidence_score] ${model} returned no parseable JSON array, trying next model`);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.warn(`[confidence_score] ${model} returned malformed JSON, trying next model`);
        continue;
      }
      if (!Array.isArray(parsed)) continue;

      for (const p of parsed) {
        if (!p || typeof p.ticker !== "string" || typeof p.confidence !== "number") continue;
        const confidence = Math.max(0, Math.min(100, Math.round(p.confidence)));
        result.set(p.ticker.toUpperCase().trim(), { confidence, reason: String(p.reason ?? "").slice(0, 200) });
      }
      return result; // succeeded with this model, no need to try the rest
    } catch (err) {
      console.warn(`[confidence_score] ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return result;
}

// Ranks stocks for display: highest-confidence bullish first, then bearish,
// then neutral/hold last, within each group by confidence descending. Uses
// Groq to score confidence given each stock's already-decided signal plus
// supporting data; falls back to the deterministic point-margin confidence
// (computed in technical_analysis.ts) for any ticker Groq didn't return a
// score for, so a Groq outage never breaks the ordering, just makes it purely
// deterministic for that run.
export async function scoreConfidence(items: ConfidenceInput[]): Promise<Map<string, ConfidenceResult>> {
  const result = new Map<string, ConfidenceResult>();
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const scored = await scoreChunkWithGroq(chunk);
      for (const it of chunk) {
        const groqScore = scored.get(it.ticker);
        if (groqScore) result.set(it.ticker, { confidence: groqScore.confidence, reason: groqScore.reason, source: "groq" });
      }
    }
  }

  for (const it of items) {
    if (!result.has(it.ticker)) {
      result.set(it.ticker, { confidence: it.deterministicConfidence, reason: null, source: "deterministic" });
    }
  }

  const groqCount = [...result.values()].filter((r) => r.source === "groq").length;
  console.log(`[confidence_score] scored ${items.length} tickers - ${groqCount} via Groq, ${items.length - groqCount} deterministic fallback`);

  return result;
}
