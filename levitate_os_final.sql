-- LEVITATE OS - FINAL COMPREHENSIVE SQL SCRIPT
-- Run this script in the Supabase SQL Editor to fully set up the database schema.
-- This script is idempotent: it can be run multiple times safeley.

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Departments Table
create table if not exists departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Departments
insert into departments (name, slug, description) values
('Sales & Marketing', 'sales-marketing', 'Led by CEO & Co-Founder. Focus: Sales, Marketing, Customer Success.'),
('Technology Development', 'tech-dev', 'Led by CTO & Co-Founder. Focus: Web/Software Dev, QA.'),
('Mechanical Design', 'mech-design', 'Led by Head of Engineering. Focus: CAD, 3D Modeling, Simulation.'),
('UI/UX & Graphic Design', 'design', 'Led by Design Head. Focus: UI/UX, Branding, Graphics.'),
('Finance & Operations', 'finance-ops', 'Led by CEO. Focus: Finance, HR, Operations.')
on conflict (slug) do nothing;


-- 3. Profiles Table (Extends auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'employee' check (role in ('super_admin', 'admin', 'manager', 'employee', 'client')),
  department_id uuid references departments(id),
  job_title text,
  phone text,
  bio text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;
do $$ begin
  drop policy if exists "Public profiles are viewable by everyone" on profiles;
  create policy "Public profiles are viewable by everyone" on profiles for select using (true);
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Users can insert their own profile" on profiles;
  create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Users can update own profile" on profiles;
  create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Admins can update any profile" on profiles;
  create policy "Admins can update any profile" on profiles for update using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin')));
exception when others then null; end $$;


-- 4. Projects Table
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  client_name text,
  client_email text,
  status text default 'new' check (status in ('new', 'assigned', 'in_progress', 'review', 'approved', 'completed', 'archived')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  department_id uuid references departments(id),
  assigned_to uuid references profiles(id),
  start_date date,
  due_date date,
  budget numeric,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table projects enable row level security;
do $$ begin
  drop policy if exists "Projects viewable by authenticated users" on projects;
  create policy "Projects viewable by authenticated users" on projects for select using (auth.role() = 'authenticated');
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Admins/Managers can manage projects" on projects;
  create policy "Admins/Managers can manage projects" on projects for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin', 'manager')));
exception when others then null; end $$;


-- 5. Tasks Table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  assigned_to uuid references profiles(id),
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table tasks enable row level security;
do $$ begin
  drop policy if exists "Tasks viewable by team" on tasks;
  create policy "Tasks viewable by team" on tasks for select using (auth.role() = 'authenticated');
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Tasks manageable by team" on tasks;
  create policy "Tasks manageable by team" on tasks for all using (auth.role() = 'authenticated');
exception when others then null; end $$;


-- 6. Messages Table (Internal Chat)
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  sender_id uuid references profiles(id) not null,
  recipient_id uuid references profiles(id),
  channel_id text,
  is_dm boolean default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table messages enable row level security;
do $$ begin
  drop policy if exists "Messages viewable by authenticated users" on messages;
  create policy "Messages viewable by authenticated users" on messages for select using (auth.role() = 'authenticated');
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Users can send messages" on messages;
  create policy "Users can send messages" on messages for insert with check (auth.uid() = sender_id);
exception when others then null; end $$;


-- 7. Activity Logs
create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table activity_logs enable row level security;
do $$ begin
  drop policy if exists "Admins view all logs" on activity_logs;
  create policy "Admins view all logs" on activity_logs for select using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin')));
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Users view own logs" on activity_logs;
  create policy "Users view own logs" on activity_logs for select using (auth.uid() = user_id);
exception when others then null; end $$;
do $$ begin
  drop policy if exists "System can insert logs" on activity_logs;
  create policy "System can insert logs" on activity_logs for insert with check (true);
exception when others then null; end $$;


-- 8. Invitations
create table if not exists invitations (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  role text default 'employee',
  department_id uuid references departments(id),
  invited_by uuid references profiles(id),
  token text unique not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table invitations enable row level security;
do $$ begin
  drop policy if exists "Admins manage invitations" on invitations;
  create policy "Admins manage invitations" on invitations for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin')));
exception when others then null; end $$;


-- 9. Notifications
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  title text not null,
  message text,
  type text check (type in ('info', 'success', 'warning', 'error', 'task_assigned', 'project_update', 'message')),
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table notifications enable row level security;
do $$ begin
  drop policy if exists "Users manage own notifications" on notifications;
  create policy "Users manage own notifications" on notifications for all using (auth.uid() = user_id);
exception when others then null; end $$;


-- 10. File Management (Vault)
create table if not exists files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  size bigint,
  type text,
  url text not null,
  uploaded_by uuid references profiles(id),
  project_id uuid references projects(id),
  folder text default '/',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table files enable row level security;
do $$ begin
  drop policy if exists "Authenticated users view files" on files;
  create policy "Authenticated users view files" on files for select using (auth.role() = 'authenticated');
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Users manage own files" on files;
  create policy "Users manage own files" on files for all using (auth.uid() = uploaded_by);
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Admins manage all files" on files;
  create policy "Admins manage all files" on files for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin')));
exception when others then null; end $$;


-- 11. Leads (CRM)
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  service_category text,
  message text,
  budget text,
  file_url text,
  status text default 'New' check (status in ('New', 'Contacted', 'Follow Up', 'Closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  business_type text,
  city text,
  google_map_link text,
  website_link text,
  is_followup boolean default false,
  notes text,
  deal_value numeric,
  source text
);

alter table leads enable row level security;
do $$ begin
  drop policy if exists "Leads manageable by authenticated users" on leads;
  create policy "Leads manageable by authenticated users" on leads for all using (auth.role() = 'authenticated');
exception when others then null; end $$;


-- 12. Posts (Blog)
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  cover_image text,
  category text,
  published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_time text,
  author_id uuid references auth.users(id)
);

alter table posts enable row level security;
do $$ begin
  drop policy if exists "Public posts are viewable by everyone" on posts;
  create policy "Public posts are viewable by everyone" on posts for select using (true);
exception when others then null; end $$;
do $$ begin
  drop policy if exists "Admins can manage posts" on posts;
  create policy "Admins can manage posts" on posts for all using (auth.role() = 'authenticated');
exception when others then null; end $$;


-- 13. Settings
create table if not exists settings (
  key text primary key,
  value text not null
);

alter table settings enable row level security;
do $$ begin
  drop policy if exists "Admins can manage settings" on settings;
  create policy "Admins can manage settings" on settings for all using (auth.role() = 'authenticated');
exception when others then null; end $$;

insert into settings (key, value) values ('linkedin_target_urn', '') on conflict do nothing;


-- 14. Triggers (Handle User Signup)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'employee');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication errors on re-run
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- End of Script
