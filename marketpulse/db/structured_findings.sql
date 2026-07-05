-- Structured versions of detailed_analysis/risk_notes — same underlying
-- content, but as a JSON array of { text, tone } / { text, severity } so the
-- frontend can render a real checklist (icon + color per line) instead of
-- one run-on paragraph.
alter table daily_digest add column if not exists signal_findings jsonb;
alter table daily_digest add column if not exists risk_findings jsonb;

NOTIFY pgrst, 'reload schema';
