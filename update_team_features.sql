-- TEAM & INVITE FEATURES UPDATE

-- 1. Add 'name' column to invitations table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitations' AND column_name = 'name') THEN
        ALTER TABLE invitations ADD COLUMN name text;
    END IF;
END $$;

-- 2. Ensure 'status' column exists in profiles for Soft Delete
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE profiles ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;
END $$;

-- 3. RLS for deleting/updating users (Admins only)
-- Ensure admins can update any profile (to set status to inactive)
create policy "Admins can update any profile"
on profiles for update
using (
  auth.uid() in (
    select id from profiles where role in ('super_admin', 'admin')
  )
);
