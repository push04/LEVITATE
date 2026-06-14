-- potential_leads: stores scraped/generated leads before they are qualified
-- Separate from `leads` (which are CRM leads the admin is actively working)

create table if not exists potential_leads (
  id              uuid primary key default gen_random_uuid(),
  business_name   text not null,
  address         text,
  phone           text,
  email           text,
  website         text,
  city            text not null,
  category        text not null,
  ai_score        integer not null default 0 check (ai_score between 0 and 100),
  status          text not null default 'pending' check (status in ('pending','qualified','rejected','converted')),
  raw_data        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists potential_leads_city_idx      on potential_leads(city);
create index if not exists potential_leads_category_idx  on potential_leads(category);
create index if not exists potential_leads_status_idx    on potential_leads(status);
create index if not exists potential_leads_score_idx     on potential_leads(ai_score desc);
create index if not exists potential_leads_city_cat_idx  on potential_leads(city, category);
create index if not exists potential_leads_created_idx   on potential_leads(created_at desc);

-- Partial index for pending leads (the most common query)
create index if not exists potential_leads_pending_idx
  on potential_leads(city, category, ai_score desc)
  where status = 'pending';

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists potential_leads_updated_at on potential_leads;
create trigger potential_leads_updated_at
  before update on potential_leads
  for each row execute function set_updated_at();

-- RLS: only service role or authenticated admins can read/write
alter table potential_leads enable row level security;

-- Service role bypasses RLS — admin API uses service role key
-- Session-authenticated users (admin dashboard) need a policy:
create policy "Admins can read potential_leads"
  on potential_leads for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );

create policy "Admins can insert potential_leads"
  on potential_leads for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );

create policy "Admins can update potential_leads"
  on potential_leads for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );

create policy "Admins can delete potential_leads"
  on potential_leads for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );

-- Business users (v1/leads API): read their own city/category filtered leads
-- (API key auth is handled at the route level via api_keys table;
--  this policy covers session-based access if ever needed)
create policy "Authenticated users can read pending leads"
  on potential_leads for select
  using (
    auth.role() = 'authenticated'
    and status = 'pending'
  );
