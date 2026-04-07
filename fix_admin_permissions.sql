-- FIX ADMIN PERMISSIONS & PROFILE STATUS
-- 1. Fix Profile Status Constraint
-- The 'suspended' status was causing errors because it wasn't in the allowed check list.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

-- 2. Ensure Invitation Deletion Permissions
-- Explicitly allow Admins and Super Admins to DELETE invitations.

do $$ begin
  drop policy if exists "Admins manage invitations" on invitations;
  drop policy if exists "Admins delete invitations" on invitations;
exception when others then null; end $$;

-- Re-create comprehensive policy for Admins/Super Admins
create policy "Admins manage invitations" 
  on invitations 
  for all 
  using (
    auth.uid() in (
      select id from profiles 
      where role in ('super_admin', 'admin')
    )
  );
