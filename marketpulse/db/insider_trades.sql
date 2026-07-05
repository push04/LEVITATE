-- Insider trading disclosures (NSE "PIT" / SEBI-mandated promoter & insider
-- transaction filings) — a genuinely documented predictive signal (insider
-- buying tends to precede outperformance) distinct from anything derivable
-- from OHLC/price-technicals alone. See ingestion/insider_trading_pull.ts.
create table if not exists insider_trades (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  company_name text,
  person_name text,
  person_category text, -- e.g. Director, Promoter, Designated Person
  transaction_type text, -- Buy / Sell
  security_type text,
  quantity numeric,
  value numeric,
  shares_after_pct numeric, -- % of company held after this transaction
  acquisition_mode text, -- Market Purchase, ESOP, Gift, etc.
  intimation_date date, -- when the disclosure was filed with the exchange
  transaction_date date, -- when the actual trade happened
  nse_did text, -- NSE's own disclosure id, used for dedup
  ingested_at timestamptz not null default now(),
  unique (nse_did)
);
create index if not exists insider_trades_ticker_idx on insider_trades(ticker, transaction_date);

-- Informational only for now (surfaced in the digest, not yet part of
-- trend_signal scoring) — there isn't enough accumulated history yet to
-- backtest whether insider-buying predicts anything here, unlike the price
-- technicals which had a full year of data to validate against on day one.
alter table daily_digest add column if not exists insider_buy_count_30d int;
alter table daily_digest add column if not exists insider_sell_count_30d int;

NOTIFY pgrst, 'reload schema';
