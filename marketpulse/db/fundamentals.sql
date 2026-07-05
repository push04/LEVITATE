-- Company fundamentals — a genuinely different information source from
-- price/technicals: valuation, profitability, leverage, growth, and analyst
-- consensus (target price, recommendation). Pulled from Yahoo Finance's
-- quoteSummary endpoint (see ingestion/fundamentals_pull.ts). Informational
-- for now, not yet part of trend_signal scoring — there's no historical
-- fundamentals series to backtest against (only current snapshots are
-- available for free), unlike price technicals which had a year of history
-- to validate against from day one.
create table if not exists fundamentals (
  ticker text primary key,
  pe_forward numeric,
  profit_margin numeric,
  return_on_equity numeric,
  return_on_assets numeric,
  debt_to_equity numeric,
  current_ratio numeric,
  revenue_growth numeric,
  earnings_growth numeric,
  gross_margin numeric,
  operating_margin numeric,
  analyst_target_mean_price numeric,
  analyst_recommendation_mean numeric, -- 1 = strong buy, 5 = strong sell
  analyst_recommendation_key text,
  number_of_analyst_opinions int,
  held_percent_insiders numeric,
  held_percent_institutions numeric,
  beta numeric,
  updated_at timestamptz not null default now()
);

alter table daily_digest add column if not exists analyst_target_mean_price numeric;
alter table daily_digest add column if not exists analyst_recommendation_key text;

NOTIFY pgrst, 'reload schema';
