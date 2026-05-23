
-- Fix Projects Table Schema and Policies
-- 1. Ensure created_by exists
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'created_by') then
        alter table projects add column created_by uuid references auth.users(id) default auth.uid();
    end if;
end $$;

-- 2. Drop existing policies to clean up
do $$ begin
  drop policy if exists "Authenticated users can create projects" on projects;
  drop policy if exists "Everyone can create projects" on projects;
  drop policy if exists "Enable insert for authenticated users" on projects;
  
  drop policy if exists "Users view assigned or own projects" on projects;
  drop policy if exists "Company users can view their company projects" on projects;
  drop policy if exists "Enable read access for all users" on projects;
  
  drop policy if exists "Super Admins and Managers view all projects" on projects;
  drop policy if exists "Admins/Managers can manage projects" on projects;
exception when others then null; end $$;

-- 3. Create Comprehensive Policies

-- INSERT: Allow any authenticated user to create a project
create policy "Enable insert for authenticated users" 
  on projects for insert 
  with check (auth.role() = 'authenticated');

-- SELECT: Allow users to view projects if they are:
-- a) The creator
-- b) Assigned to the project
-- c) The owner of the company the project belongs to
-- d) An Admin/Manager
create policy "Enable read access for stakeholders" 
  on projects for select 
  using (
    -- Creator
    created_by = auth.uid() 
    OR 
    -- Assigned
    assigned_to = auth.uid()
    OR
    -- Company Owner (if company_id is present)
    exists (
      select 1 from companies 
      where companies.id = projects.company_id 
      and companies.owner_id = auth.uid()
    )
    OR
    -- Admin/Manager
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );

-- UPDATE: Allow updates for creators, assignees, company owners, and admins
create policy "Enable update for stakeholders" 
  on projects for update 
  using (
    created_by = auth.uid() 
    OR 
    assigned_to = auth.uid()
    OR
    exists (
      select 1 from companies 
      where companies.id = projects.company_id 
      and companies.owner_id = auth.uid()
    )
    OR
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );

-- DELETE: Only Admins/Managers and Company Owners
create policy "Enable delete for owners and admins" 
  on projects for delete 
  using (
    exists (
      select 1 from companies 
      where companies.id = projects.company_id 
      and companies.owner_id = auth.uid()
    )
    OR
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );
