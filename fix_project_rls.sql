-- Fix RLS policies for Projects table
-- OBJECTIVE: Allow ANY authenticated user to CREATE projects.
-- Admins/Managers handle everything else. Creators can edit their own.

-- 1. Drop existing policies to start fresh
do $$ begin
  drop policy if exists "Admins/Managers can manage projects" on projects;
  drop policy if exists "Projects viewable by authenticated users" on projects;
  drop policy if exists "Projects viewable by all team members" on projects;
  drop policy if exists "Admins and Managers can manage projects" on projects;
exception when others then null; end $$;

-- 2. VIEWING: Allow all authenticated users to view all projects (Team collaboration)
create policy "Everyone can view projects" 
  on projects for select 
  using (auth.role() = 'authenticated');

-- 3. CREATION: Allow ANY authenticated user to insert a project
create policy "Everyone can create projects" 
  on projects for insert 
  with check (auth.role() = 'authenticated');

-- 4. UPDATING/DELETING: 
-- A. Admins and Managers can do anything
create policy "Admins and Managers can update/delete any project" 
  on projects for update
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
  );

create policy "Admins and Managers can delete any project" 
  on projects for delete
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
  );

-- B. Project Creators can update their own projects
create policy "Creators can update own projects" 
  on projects for update 
  using (auth.uid() = created_by);

-- Note: We generally don't let creators delete projects unless they are admins, to preserve history.
