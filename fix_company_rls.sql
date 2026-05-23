-- Fix Company RLS Policies
-- OBJECTIVE: Ensure owners can definitely view their companies. 

-- 1. Drop existing policies to start fresh and avoid conflicts
do $$ begin
  drop policy if exists "Company owners can view own company" on companies;
  drop policy if exists "Company owners can update own company" on companies;
  drop policy if exists "Enable read access for authenticated users" on companies;
exception when others then null; end $$;

-- 2. Grant Permissions
-- A. SELECT: Allow users to view a company if:
--    1. They own it
--    2. They are an Admin/Super Admin
create policy "Identify company for owners and admins" 
  on companies for select 
  using (
    owner_id = auth.uid() 
    OR 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );

-- B. INSERT: Allow any authenticated user to create a company
create policy "Authenticated users can create companies" 
  on companies for insert 
  with check (auth.role() = 'authenticated');

-- C. UPDATE: Only Owner and Admins
create policy "Owners and Admins can update company" 
  on companies for update 
  using (
    owner_id = auth.uid() 
    OR 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );
