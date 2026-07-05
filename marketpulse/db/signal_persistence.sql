-- Backtesting showed requiring a directional signal to hold for 2 consecutive
-- days (not act on a single-day blip) measurably improves accuracy
-- (41.7% -> 45.3% on stored history). trend_signal becomes the
-- persistence-adjusted signal actually used for predictions/display;
-- raw_trend_signal keeps the un-adjusted daily read so the next day's run
-- has something real to compare against (comparing against an
-- already-adjusted value would break the day-over-day check).
alter table daily_digest add column if not exists raw_trend_signal text;

NOTIFY pgrst, 'reload schema';
