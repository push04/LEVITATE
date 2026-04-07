-- INSTALL SALES MODULE
-- Run this script to set up the database for the Sales & Marketing features.

-- 1. Campaigns Table (For Email Marketing)
create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  body text not null,
  target_audience text, -- e.g. 'all', 'new_leads', 'real_estate'
  status text default 'draft' check (status in ('draft', 'sending', 'sent')),
  sent_count integer default 0,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RLS for Campaigns
alter table campaigns enable row level security;

do $$ begin
  drop policy if exists "Sales and Admins manage campaigns" on campaigns;
  create policy "Sales and Admins manage campaigns" on campaigns for all 
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager') 
      or department_id in (select id from departments where slug = 'sales-marketing')
    )
  );
exception when others then null; end $$;

-- 3. Ensure Sales Team Access to Leads
-- (Users might already have access via 'authenticated' policy, but let's be specific if needed)
-- The existing policy "Leads manageable by authenticated users" covers this, but if we wanted to restrict it later, we would add specific policies here.
