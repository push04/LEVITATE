-- ADVANCED TASK FEATURES & PERMISSIONS SETUP (FIXED)
-- Run this script to ensure all CRUD features work.

-- 1. Ensure 'priority' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority') THEN
        ALTER TABLE tasks ADD COLUMN priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
    END IF;
END $$;

-- 2. Ensure 'description' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'description') THEN
        ALTER TABLE tasks ADD COLUMN description text;
    END IF;
END $$;

-- 3. Update RLS Policies for Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to VIEW tasks
DROP POLICY IF EXISTS "View tasks" ON tasks;
CREATE POLICY "View tasks" ON tasks FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to INSERT tasks
DROP POLICY IF EXISTS "Create tasks" ON tasks;
CREATE POLICY "Create tasks" ON tasks FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to UPDATE tasks
DROP POLICY IF EXISTS "Update tasks" ON tasks;
CREATE POLICY "Update tasks" ON tasks FOR UPDATE
USING (auth.role() = 'authenticated');

-- Allow Admins/Managers AND Assignees to DELETE tasks
-- (Removed reliance on 'created_by' as it does not exist)
DROP POLICY IF EXISTS "Delete tasks" ON tasks;
CREATE POLICY "Delete tasks" ON tasks FOR DELETE
USING (
    auth.uid() = assigned_to
    OR
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
);

-- 4. Optional: Comments Table
CREATE TABLE IF NOT EXISTS task_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id),
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View comments" ON task_comments;
CREATE POLICY "View comments" ON task_comments FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Manage comments" ON task_comments;
CREATE POLICY "Manage comments" ON task_comments FOR ALL USING (auth.uid() = user_id);
