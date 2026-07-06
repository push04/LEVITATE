-- MarketPulse publish controls - run once in the Supabase SQL editor.
-- Lets the admin dashboard choose between auto-publishing every day's digest
-- to the public levitatelabs.online page, or reviewing and selecting which
-- tickers go public each day. Paying business-dashboard customers always see
-- the full digest regardless of this setting - this only gates the public,
-- unauthenticated page.

create table if not exists market_pulse_settings (
  id boolean primary key default true,
  publish_mode text not null default 'manual' check (publish_mode in ('auto', 'manual')),
  updated_at timestamptz not null default now(),
  constraint market_pulse_settings_singleton check (id)
);
insert into market_pulse_settings (id, publish_mode) values (true, 'manual') on conflict (id) do nothing;

alter table daily_digest add column if not exists published boolean not null default false;
create index if not exists daily_digest_published_idx on daily_digest(digest_date, published);

NOTIFY pgrst, 'reload schema';
