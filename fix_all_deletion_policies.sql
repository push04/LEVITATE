-- FIX ALL DELETION POLICIES (Projects & Tasks)
-- Run this script to ensure Admins can delete projects and tasks.

-- 1. Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Projects Deletion Policy
DROP POLICY IF EXISTS "Delete projects" ON projects;
CREATE POLICY "Delete projects" ON projects FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager')
    )
);

-- 3. Tasks Deletion Policy
DROP POLICY IF EXISTS "Delete tasks" ON tasks;
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

-- 4. Verify Output
DO $$
BEGIN
    RAISE NOTICE 'Project and Task delete policies recreated successfully.';
END $$;
