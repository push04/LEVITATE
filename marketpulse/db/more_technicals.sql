-- CCI and Williams %R — added after backtesting confirmed both carry a real,
-- monotonic mean-reversion signal (extremes predict a 7-day fade, not
-- continuation), which measurably improved backtested accuracy on top of the
-- existing indicator set. Parabolic SAR was also tested and dropped: its
-- bullish/bearish buckets showed no meaningful difference in forward returns
-- (not a real signal here, just noise), so it's deliberately not included.
alter table technical_indicators add column if not exists cci_20 numeric;
alter table technical_indicators add column if not exists williams_r_14 numeric;

NOTIFY pgrst, 'reload schema';
