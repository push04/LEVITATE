// Checked directly against Groq's API (response rate-limit headers), not
// assumed: on this account, only llama-3.1-8b-instant actually has the
// generous 14,400 req/day free-tier limit. Every other candidate model
// (llama-3.3-70b-versatile, openai/gpt-oss-20b/120b, llama-4-scout,
// qwen3-32b) is capped at just 1,000/day here, despite Groq's docs
// describing per-model pools - and gemma2-9b-it, which used to be in this
// list, has been fully decommissioned by Groq (confirmed via a live API
// call returning "model has been decommissioned"). A fallback chain built
// on 1,000-req/day models just burns through their budget fast and still
// ends up back on rate limits, so there is no real fallback here - just the
// one model that is actually reliable at this call volume.
export const GROQ_MODELS = ["llama-3.1-8b-instant"];
