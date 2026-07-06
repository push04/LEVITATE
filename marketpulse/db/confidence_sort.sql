-- Confidence score (0-100) used to order stocks on the public/business
-- pages: highest-confidence bullish first, then bearish, then neutral last.
-- Computed once during the daily pipeline run (processing/digest.ts calls
-- Groq to score it, falling back to a deterministic score from the
-- technical-analysis point margin if Groq is unavailable that run) - never
-- computed on the fly per page view.
alter table daily_digest add column if not exists confidence_score numeric;
alter table daily_digest add column if not exists confidence_reason text;

NOTIFY pgrst, 'reload schema';
