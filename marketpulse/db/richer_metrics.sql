-- Store the raw numeric indicators digest.ts already computes (previously
-- only rsi_14 and a prose summary were kept) so the frontend can render real
-- gauges/bars instead of re-parsing sentences.
alter table daily_digest add column if not exists current_price numeric;
alter table daily_digest add column if not exists macd numeric;
alter table daily_digest add column if not exists macd_signal numeric;
alter table daily_digest add column if not exists sma_20 numeric;
alter table daily_digest add column if not exists sma_50 numeric;
alter table daily_digest add column if not exists adx_14 numeric;
alter table daily_digest add column if not exists atr_14 numeric;
alter table daily_digest add column if not exists stoch_k numeric;
alter table daily_digest add column if not exists cci_20 numeric;
alter table daily_digest add column if not exists williams_r_14 numeric;
alter table daily_digest add column if not exists volume bigint;
alter table daily_digest add column if not exists avg_volume_20 numeric;
alter table daily_digest add column if not exists high_52w numeric;
alter table daily_digest add column if not exists low_52w numeric;

NOTIFY pgrst, 'reload schema';
