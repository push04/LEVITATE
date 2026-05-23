-- FIX FILE PERMISSIONS
-- Run this script to ensuring file uploading, viewing, and deletion works correctly.

-- 1. Drop existing policies to start fresh
do $$ begin
  drop policy if exists "Authenticated users view files" on files;
  drop policy if exists "Users manage own files" on files;
  drop policy if exists "Admins manage all files" on files;
  drop policy if exists "Authenticated users view all files" on files;
  drop policy if exists "Authenticated users can upload files" on files;
  drop policy if exists "Owners and Admins can update/delete files" on files;
  drop policy if exists "Owners and Admins can update files" on files;
exception when others then null; end $$;

-- 2. VIEWING (SELECT)
-- All authenticated users can see the file list
create policy "Authenticated users view all files"
  on files for select
  using (auth.role() = 'authenticated');

-- 3. UPLOADING (INSERT)
-- All authenticated users can upload files
create policy "Authenticated users can upload files"
  on files for insert
  with check (auth.role() = 'authenticated');

-- 4. DELETING (DELETE)
-- Users can delete their OWN files.
-- Admins and Managers can delete ANY file.
create policy "Owners and Admins can delete files"
  on files for delete
  using (
    auth.uid() = uploaded_by OR
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
  );

-- 5. UPDATING (UPDATE)
-- Users can update their OWN files.
-- Admins and Managers can update ANY file.
create policy "Owners and Admins can update files"
  on files for update
  using (
    auth.uid() = uploaded_by OR
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin', 'manager')
    )
  );
