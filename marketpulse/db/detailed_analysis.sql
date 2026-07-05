-- Adds columns for the deterministic, rules-based technical analysis
-- (processing/technical_analysis.ts) — computed from real indicator values,
-- not Groq. Run once in the Supabase SQL editor.

alter table daily_digest add column if not exists detailed_analysis text;
alter table daily_digest add column if not exists risk_notes text;
alter table daily_digest add column if not exists risk_level text;

NOTIFY pgrst, 'reload schema';
