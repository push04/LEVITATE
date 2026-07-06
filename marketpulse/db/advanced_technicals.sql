-- More advanced technicals - golden/death cross, trend strength, volume
-- confirmation. Run once in the Supabase SQL editor.

alter table technical_indicators add column if not exists sma_200 numeric;
alter table technical_indicators add column if not exists adx_14 numeric;
alter table technical_indicators add column if not exists obv numeric;
alter table technical_indicators add column if not exists obv_sma_20 numeric;
alter table technical_indicators add column if not exists stoch_k numeric;
alter table technical_indicators add column if not exists stoch_d numeric;

NOTIFY pgrst, 'reload schema';
