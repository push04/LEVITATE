-- ============================================================
-- Agent Email Log Table
-- Stores ALL emails sent/received by AI agents
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create agent_emails table
create table if not exists agent_emails (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete set null,
  agent_name text not null,           -- 'outreach', 'followup', 'reporter', 'retention'
  direction text not null check (direction in ('outbound', 'inbound')),
  to_email text,
  from_email text,
  subject text,
  body text not null,
  status text default 'sent' check (status in ('sent', 'failed', 'received')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RLS
alter table agent_emails enable row level security;

-- Service role can do everything (for agents)
drop policy if exists "Service role full access agent_emails" on agent_emails;
create policy "Service role full access agent_emails"
  on agent_emails for all using (true) with check (true);

-- 3. Enable realtime for live dashboard updates (Idempotent)
do $$ 
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'agent_emails') then
    alter publication supabase_realtime add table agent_emails;
  end if;
end $$;

-- ============================================================
-- Add deal closure tracking fields to leads table
-- ============================================================
alter table leads
  add column if not exists closed_reason text,
  add column if not exists revenue_generated numeric default 0,
  add column if not exists last_outreach_at timestamp with time zone,
  add column if not exists outreach_count integer default 0,
  add column if not exists ai_score integer default 0,
  add column if not exists has_website boolean default false,
  add column if not exists whatsapp text,
  add column if not exists google_map_link text,
  add column if not exists website_link text,
  add column if not exists source_data jsonb;

-- ============================================================
-- Add system_config table for bizdev cursor
-- ============================================================
create table if not exists system_config (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value jsonb,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table system_config enable row level security;
drop policy if exists "Service role full access system_config" on system_config;
create policy "Service role full access system_config"
  on system_config for all using (true) with check (true);

-- ============================================================
-- update_agent_credits RPC (used by bizdev.mts)
-- ============================================================
create or replace function update_agent_credits(
  p_agent_name text,
  p_amount integer,
  p_reason text default ''
) returns void as $$
begin
  insert into agent_logs (agent_name, action, input, output, status, credits_earned)
  values (p_agent_name, 'credits_update', '{}', jsonb_build_object('reason', p_reason), 'success', p_amount)
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- ============================================================
-- agent_logs table (if not exists)
-- ============================================================
create table if not exists agent_logs (
  id uuid default gen_random_uuid() primary key,
  agent_name text not null,
  action text not null,
  input jsonb default '{}',
  output jsonb default '{}',
  status text default 'success' check (status in ('success', 'failure', 'pending')),
  credits_earned integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table agent_logs enable row level security;
drop policy if exists "Service role full access agent_logs" on agent_logs;
create policy "Service role full access agent_logs"
  on agent_logs for all using (true) with check (true);
do $$ 
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'agent_logs') then
    alter publication supabase_realtime add table agent_logs;
  end if;
end $$;

-- ============================================================
-- revenue table (for reporter)
-- ============================================================
create table if not exists revenue (
  id uuid default gen_random_uuid() primary key,
  amount numeric not null,
  type text default 'payment',
  description text,
  lead_id uuid references leads(id) on delete set null,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table revenue enable row level security;
drop policy if exists "Service role full access revenue" on revenue;
create policy "Service role full access revenue"
  on revenue for all using (true) with check (true);

-- ============================================================
-- Existing email_threads + email_messages cleanup
-- Drop RLS policies me added that were wrong
-- ============================================================
drop policy if exists "Service role insert threads" on email_threads;
drop policy if exists "Service role select threads" on email_threads;
drop policy if exists "Service role insert messages" on email_messages;
drop policy if exists "Service role select messages" on email_messages;
