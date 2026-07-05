// Groq free-tier production models — all share the 14,400 RPD / 30 RPM quota
// pool per model (i.e. each model has its own 14,400/day budget, they don't
// share one pool). Same list/ordering as levitatelabs' src/lib/ai/router.ts —
// fastest/lightest first so a single model's per-minute window doesn't force
// an unnecessary fallback before its budget is actually exhausted.
export const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "gemma2-9b-it",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];
