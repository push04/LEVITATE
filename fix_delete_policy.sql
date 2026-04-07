-- FIX TASK DELETE POLICY
-- Run this script to ensure you have permission to delete tasks.

-- 1. Enable RLS (just in case)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Drop the existing Delete policy to avoid conflicts
DROP POLICY IF EXISTS "Delete tasks" ON tasks;

-- 3. Create a permissive Delete policy for Admins and Assignees
CREATE POLICY "Delete tasks" ON tasks FOR DELETE
USING (
    -- Allow if user is the assignee
    (auth.uid() = assigned_to)
    OR
    -- Allow if user is an Admin, Super Admin, or Manager
    (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager')
    ))
);

-- 4. Verify Policy (Optional - just for output)
DO $$
BEGIN
    RAISE NOTICE 'Delete policy recreated successfully.';
END $$;
