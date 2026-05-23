-- Section 5: System status tables

create type if not exists agent_run_status as enum ('success', 'failure', 'warning');

create table if not exists agent_health_log (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  last_run_at timestamptz not null default now(),
  status agent_run_status not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists agent_health_log_agent_created_idx on agent_health_log(agent_name, created_at desc);

alter table agent_health_log enable row level security;

drop policy if exists "Public can read agent health log" on agent_health_log;
create policy "Public can read agent health log"
  on agent_health_log for select
  using (true);

drop policy if exists "Service role can write agent health log" on agent_health_log;
create policy "Service role can write agent health log"
  on agent_health_log for insert
  with check (auth.role() = 'service_role');

create table if not exists status_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table status_subscribers enable row level security;

drop policy if exists "Public can insert status subscribers" on status_subscribers;
create policy "Public can insert status subscribers"
  on status_subscribers for insert
  with check (true);

drop policy if exists "Admins can read status subscribers" on status_subscribers;
create policy "Admins can read status subscribers"
  on status_subscribers for select
  using (auth.role() = 'authenticated');

