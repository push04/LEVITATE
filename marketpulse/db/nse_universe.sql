-- Replaces the old hand-picked config/nse_universe.json with a table synced
-- directly from NSE's own official Nifty 500 constituent list
-- (ingestion/universe_sync.ts). Nothing about "which companies could ever be
-- tracked" is chosen by this project — it's whatever NSE itself currently
-- publishes as the Nifty 500. Run once in the Supabase SQL editor.

create table if not exists nse_universe (
  ticker text primary key,
  yahoo_symbol text not null,
  company_name text not null,
  sector text,
  pinned boolean not null default false,
  synced_at timestamptz not null default now()
);

NOTIFY pgrst, 'reload schema';
