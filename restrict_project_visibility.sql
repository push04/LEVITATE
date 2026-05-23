-- RESTRICT PROJECT VISIBILITY
-- Run this script to enforce strict RLS on the projects table.

-- 1. Drop existing policies to start fresh
do $$ begin
  drop policy if exists "Admins/Managers can manage projects" on projects;
  drop policy if exists "Projects viewable by authenticated users" on projects;
  drop policy if exists "Projects viewable by all team members" on projects;
  drop policy if exists "Admins and Managers can manage projects" on projects;
  drop policy if exists "Everyone can view projects" on projects;
  drop policy if exists "Everyone can create projects" on projects;
  drop policy if exists "Admins and Managers can update/delete any project" on projects;
  drop policy if exists "Admins and Managers can delete any project" on projects;
  drop policy if exists "Creators can update own projects" on projects;
exception when others then null; end $$;

-- 2. VIEWING POLICIES (SELECT)
-- A. Super Admins and Managers see EVERYTHING
create policy "Super Admins and Managers view all projects" 
  on projects for select 
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'manager')
    )
  );

-- B. Admins/Employees see ONLY assigned or created projects
create policy "Users view assigned or own projects" 
  on projects for select 
  using (
    -- User is assigned to the project
    assigned_to = auth.uid() OR
    -- User created the project
    created_by = auth.uid()
  );

-- 3. CREATION (INSERT)
-- Any authenticated user can create a project
create policy "Authenticated users can create projects" 
  on projects for insert 
  with check (auth.role() = 'authenticated');

-- 4. UPDATING (UPDATE)
-- A. Super Admins and Managers can update ANY project
create policy "Super Admins and Managers update all projects" 
  on projects for update 
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'manager')
    )
  );

-- B. Project Creators/Assignees can update their own projects
create policy "Users update assigned or own projects" 
  on projects for update 
  using (
    assigned_to = auth.uid() OR
    created_by = auth.uid()
  );

-- 5. DELETING (DELETE)
-- Only Super Admins and Managers can delete projects
create policy "Super Admins and Managers delete projects" 
  on projects for delete 
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'manager')
    )
  );
