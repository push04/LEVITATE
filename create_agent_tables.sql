-- ============================================================
-- Levitate Labs — Agent Infrastructure Tables
-- Run this ONCE in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eelwkowdkpmobbudqqlb/sql/new
-- ============================================================

-- 1. agent_rewards — tracks each agent's credit balance and performance
-- ============================================================
create table if not exists public.agent_rewards (
  id              uuid primary key default gen_random_uuid(),
  agent_name      text not null unique,
  current_balance integer not null default 100,
  total_earned    integer not null default 0,
  total_spent     integer not null default 0,
  success_rate    numeric(5,2) not null default 100,
  tasks_completed integer not null default 0,
  tasks_failed    integer not null default 0,
  is_suspended    boolean not null default false,
  suspension_reason text,
  tier            text not null default 'NORMAL',
  api_budget_multiplier numeric(4,2) default 1.0,
  priority_level  integer default 5,
  last_active_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. agent_logs — every agent run is logged here (the activity feed)
-- ============================================================
create table if not exists public.agent_logs (
  id              uuid primary key default gen_random_uuid(),
  agent_name      text not null,
  agent_version   text default '1.0',
  action          text not null,
  status          text not null default 'success',  -- success | failure | partial
  input           jsonb,
  output          jsonb,
  credits_earned  integer not null default 0,
  duration_ms     integer,
  tokens_used     integer default 0,
  ai_provider     text,
  project_id      uuid,
  lead_id         uuid,
  task_id         uuid,
  created_at      timestamptz not null default now()
);

-- index for fast dashboard queries
create index if not exists agent_logs_agent_name_idx on public.agent_logs (agent_name);
create index if not exists agent_logs_created_at_idx on public.agent_logs (created_at desc);
create index if not exists agent_logs_status_idx     on public.agent_logs (status);

-- 3. system_config — key/value store for agent settings
-- ============================================================
create table if not exists public.system_config (
  key         text primary key,
  value       jsonb not null default '{}',
  description text,
  updated_at  timestamptz not null default now()
);

-- 4. revenue — tracks all payments received
-- ============================================================
create table if not exists public.revenue (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric(12,2) not null,
  type        text not null default 'advance',  -- advance | final | subscription
  client_name text,
  project_id  uuid,
  lead_id     uuid,
  razorpay_payment_id text,
  received_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 5. update_agent_credits RPC — called by all agents to update balance
-- ============================================================
create or replace function public.update_agent_credits(
  p_agent_name text,
  p_amount     integer,
  p_reason     text default ''
)
returns void
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
  v_tier        text;
begin
  -- upsert agent into agent_rewards if not exists
  insert into public.agent_rewards (agent_name, current_balance)
  values (p_agent_name, 100)
  on conflict (agent_name) do nothing;

  -- update balance
  update public.agent_rewards
  set
    current_balance = greatest(0, current_balance + p_amount),
    total_earned    = case when p_amount > 0 then total_earned + p_amount else total_earned end,
    total_spent     = case when p_amount < 0 then total_spent + abs(p_amount) else total_spent end,
    last_active_at  = now(),
    updated_at      = now()
  where agent_name = p_agent_name
  returning current_balance into v_new_balance;

  -- update tier based on new balance
  v_tier := case
    when v_new_balance >= 1000 then 'LEGENDARY'
    when v_new_balance >= 500  then 'ELITE'
    when v_new_balance >= 200  then 'PERFORMING'
    when v_new_balance >= 50   then 'NORMAL'
    else 'PROBATION'
  end;

  update public.agent_rewards
  set tier = v_tier
  where agent_name = p_agent_name;
end;
$$;

-- ============================================================
-- 6. Enable Realtime on agent_logs (for live dashboard feed)
-- ============================================================
alter publication supabase_realtime add table public.agent_logs;

-- ============================================================
-- 7. RLS Policies — service role bypasses all, anon blocked
-- ============================================================
alter table public.agent_rewards  enable row level security;
alter table public.agent_logs     enable row level security;
alter table public.system_config  enable row level security;
alter table public.revenue        enable row level security;

-- Service role (used by agents) can do everything
create policy "service_role_all" on public.agent_rewards  for all using (true);
create policy "service_role_all" on public.agent_logs     for all using (true);
create policy "service_role_all" on public.system_config  for all using (true);
create policy "service_role_all" on public.revenue        for all using (true);

-- ============================================================
-- 8. Seed default agent records (18 agents)
-- ============================================================
insert into public.agent_rewards (agent_name, current_balance, tier) values
  ('bizdev',           100, 'NORMAL'),
  ('research',         100, 'NORMAL'),
  ('outreach',         100, 'NORMAL'),
  ('followup',         100, 'NORMAL'),
  ('discovery',        100, 'NORMAL'),
  ('proposal',         100, 'NORMAL'),
  ('onboarding',       100, 'NORMAL'),
  ('invoice',          100, 'NORMAL'),
  ('retention',        100, 'NORMAL'),
  ('reporter',         100, 'NORMAL'),
  ('supabase_heartbeat',100,'NORMAL'),
  ('agent_evaluator',  100, 'NORMAL'),
  ('architect',        100, 'NORMAL'),
  ('coder',            100, 'NORMAL'),
  ('reviewer',         100, 'NORMAL'),
  ('tester',           100, 'NORMAL'),
  ('debugger',         100, 'NORMAL'),
  ('deployer',         100, 'NORMAL')
on conflict (agent_name) do nothing;

-- 9. Seed default system config
insert into public.system_config (key, value, description) values
  ('outreach_limits', '{"daily_max": 50, "hourly_max": 5}', 'Daily/hourly outreach email limits'),
  ('bizdev_cursor',   '{"cursor": 0, "total_combos": 2394, "cities": 38, "categories": 63}', 'BizDev rotation cursor'),
  ('rate_card',       '{"landing_page": {"min": 3000, "max": 6000, "days": 3}, "business_website": {"min": 6000, "max": 15000, "days": 7}, "ecommerce": {"min": 15000, "max": 40000, "days": 21}}', 'Pricing rate card')
on conflict (key) do nothing;

-- ============================================================
-- Done! All agent infrastructure tables created.
-- ============================================================
select 'agent_rewards' as table_name, count(*) as rows from public.agent_rewards
union all
select 'agent_logs',   count(*) from public.agent_logs
union all
select 'system_config',count(*) from public.system_config
union all
select 'revenue',      count(*) from public.revenue;
