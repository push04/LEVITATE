-- Prediction accountability: every signal the digest generates gets recorded
-- here and auto-evaluated N days later against what the price actually did.
-- This is what powers a genuine, checkable track record instead of just
-- asserting "our signals are good". Run once in the Supabase SQL editor.

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  company_name text,
  prediction_date date not null,
  signal text not null check (signal in ('bullish', 'bearish', 'neutral')),
  price_at_prediction numeric not null,
  target_days int not null default 7,
  target_date date not null, -- prediction_date + target_days, precomputed for easy querying
  evaluated boolean not null default false,
  evaluation_date date,
  price_at_evaluation numeric,
  price_change_pct numeric,
  outcome text check (outcome in ('correct', 'incorrect', 'inconclusive')),
  created_at timestamptz not null default now(),
  unique (ticker, prediction_date)
);
create index if not exists predictions_target_date_idx on predictions(target_date) where not evaluated;
create index if not exists predictions_signal_outcome_idx on predictions(signal, outcome);

-- Backtest runs - a separate, explicit "we ran the same logic against
-- history" record, kept distinct from live day-by-day predictions above.
create table if not exists backtest_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  target_days int not null,
  total_signals int not null,
  bullish_correct int not null default 0,
  bullish_total int not null default 0,
  bearish_correct int not null default 0,
  bearish_total int not null default 0,
  neutral_correct int not null default 0,
  neutral_total int not null default 0,
  overall_accuracy_pct numeric,
  notes text
);

NOTIFY pgrst, 'reload schema';
