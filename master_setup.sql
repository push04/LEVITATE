-- MASTER SETUP SCRIPT
-- Run this single script to apply ALL fixes and install ALL new modules.
-- It is safe to run even if you ran individual scripts before.

-- ==========================================
-- 1. FIX ADMIN PERMISSIONS & PROFILES
-- ==========================================
-- Fix Profile Status Check Constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

-- Fix Invitation Deletion Policies
do $$ begin
  drop policy if exists "Admins manage invitations" on invitations;
  create policy "Admins manage invitations" 
  on invitations 
  for all 
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin')
    )
  );
exception when others then null; end $$;

-- ==========================================
-- 2. RESTRICT PROJECT VISIBILITY
-- ==========================================
-- Ensure assigned_to exists
alter table projects 
add column if not exists assigned_to uuid references profiles(id);

-- Reset Project Policies
do $$ begin
  drop policy if exists "Projects viewable by authenticated users" on projects;
  drop policy if exists "Admins/Managers can manage projects" on projects;
  drop policy if exists "View Projects" on projects;
  drop policy if exists "Create Projects" on projects;
  drop policy if exists "Update Projects" on projects;
  drop policy if exists "Delete Projects" on projects;
exception when others then null; end $$;

-- View: Admins, Managers, Creators, Assignees
create policy "View Projects"
  on projects for select
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
    OR auth.uid() = created_by
    OR auth.uid() = assigned_to
  );

-- Create: All Authenticated
create policy "Create Projects"
  on projects for insert
  with check (auth.role() = 'authenticated');

-- Update: Admins, Managers, Creators, Assignees
create policy "Update Projects"
  on projects for update
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
    OR auth.uid() = created_by
    OR auth.uid() = assigned_to
  );

-- Delete: Admins, Managers, Creators
create policy "Delete Projects"
  on projects for delete
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
    OR auth.uid() = created_by
  );

-- ==========================================
-- 3. FIX FILE & STORAGE PERMISSIONS
-- ==========================================
-- Storage: Create Bucket
insert into storage.buckets (id, name, public)
values ('vault', 'vault', true)
on conflict (id) do nothing;

-- Storage: Policies
do $$ begin
  drop policy if exists "Authenticated users can upload objects" on storage.objects;
  drop policy if exists "Anyone can view objects" on storage.objects;
  drop policy if exists "Owners and Admins can delete objects" on storage.objects;
exception when others then null; end $$;

create policy "Anyone can view objects"
  on storage.objects for select
  using ( bucket_id = 'vault' );

create policy "Authenticated users can upload objects"
  on storage.objects for insert
  with check (
    bucket_id = 'vault' AND
    auth.role() = 'authenticated'
  );

create policy "Owners and Admins can delete objects"
  on storage.objects for delete
  using (
    bucket_id = 'vault' AND
    (
      auth.uid() = owner OR
      auth.uid() in (
        select id from public.profiles 
        where role in ('super_admin', 'admin', 'manager')
      )
    )
  );

-- Files Table: Policies
do $$ begin
  drop policy if exists "Authenticated users view files" on files;
  drop policy if exists "Users manage own files" on files;
  drop policy if exists "Admins manage all files" on files;
  drop policy if exists "Authenticated users view all files" on files;
  drop policy if exists "Authenticated users can upload files" on files;
  drop policy if exists "Owners and Admins can update/delete files" on files;
  drop policy if exists "Owners and Admins can update files" on files;
  drop policy if exists "Owners and Admins can delete files" on files;
exception when others then null; end $$;

create policy "Authenticated users view all files"
  on files for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can upload files"
  on files for insert
  with check (auth.role() = 'authenticated');

create policy "Owners and Admins can delete files"
  on files for delete
  using (
    auth.uid() = uploaded_by OR
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
  );

create policy "Owners and Admins can update files"
  on files for update
  using (
    auth.uid() = uploaded_by OR
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
  );

-- ==========================================
-- 4. CHAT ATTACHMENTS
-- ==========================================
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB;

-- ==========================================
-- 5. INSTALL SALES MODULE
-- ==========================================
create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  body text not null,
  target_audience text,
  status text default 'draft' check (status in ('draft', 'sending', 'sent')),
  sent_count integer default 0,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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
