-- Create Hackathons table for Growth Dashboard
create table if not exists hackathons (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  url text not null,
  platform text not null check (platform in ('Devpost', 'MLH', 'Unstop', 'Devfolio', 'HackerEarth', 'DoraHacks', 'Hashnode', 'Other')),
  description text,
  location text, -- New field for Remote/India
  
  -- AI Extracted Fields
  prize_pool text, -- e.g. "$50,000"
  deadline timestamptz,
  tech_stack text[], -- e.g. ['AI', 'Web3']
  status text default 'saved' check (status in ('saved', 'applied', 'won', 'discarded')),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table hackathons enable row level security;

-- Policies (Accessible by admins)
create policy "Admins can view hackathons"
  on hackathons for select
  using ( auth.uid() in (select id from profiles where role in ('admin', 'manager')) );

create policy "Admins can insert hackathons"
  on hackathons for insert
  with check ( auth.uid() in (select id from profiles where role in ('admin', 'manager')) );

create policy "Admins can update hackathons"
  on hackathons for update
  using ( auth.uid() in (select id from profiles where role in ('admin', 'manager')) );

create policy "Admins can delete hackathons"
  on hackathons for delete
  using ( auth.uid() in (select id from profiles where role in ('admin', 'manager')) );

-- Add indexes for common queries
create index if not exists hackathons_platform_idx on hackathons(platform);
create index if not exists hackathons_status_idx on hackathons(status);
create index if not exists hackathons_deadline_idx on hackathons(deadline);
