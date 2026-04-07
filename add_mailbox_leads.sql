-- Create Leads Table
create table if not exists leads (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  company text,
  service_category text,
  budget text,
  message text,
  file_url text,
  status text default 'new', -- new, contacted, qualified, closed, spam
  ai_score integer, -- 0-100
  ai_summary text,
  ai_priority text, -- Low, Medium, High
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Lead Emails Table (for conversation history)
create table if not exists lead_emails (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references leads(id) on delete cascade not null,
  sender_type text not null, -- 'user' (lead) or 'admin'
  sender_id uuid references auth.users(id), -- null if sender is lead
  subject text,
  body text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table leads enable row level security;
alter table lead_emails enable row level security;

-- Leads: Detect if admin (public can insert/create via contact form, but only see their own? No, actually, public insert is anonymous usually)
-- For this app, we'll allow public INSERT, but only Admins can SELECT/UPDATE/DELETE.

create policy "Admins can do everything on leads"
  on leads for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- Allow public insert (for contact form) - assuming anon key usage
create policy "Public can insert leads"
  on leads for insert
  with check (true);

-- Lead Emails: Admins can do everything
create policy "Admins can do everything on lead_emails"
  on lead_emails for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );
