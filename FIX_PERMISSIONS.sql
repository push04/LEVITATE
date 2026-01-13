-- ============================================
-- FIX PERMISSIONS FOR LEADS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable RLS (just in case)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone to INSERT leads (Contact Form) - Functioning
DROP POLICY IF EXISTS "Anyone can create leads" ON leads;
CREATE POLICY "Anyone can create leads" ON leads FOR INSERT WITH CHECK (true);

-- 3. Allow READ access (Fixing the dashboard issue)
-- Ideally this should be restricted, but for debugging/MVP:
DROP POLICY IF EXISTS "Enable read access for all users" ON leads;
CREATE POLICY "Enable read access for all users" ON leads FOR SELECT USING (true);

-- 4. Allow UPDATE access (For changing status)
DROP POLICY IF EXISTS "Enable update access for all users" ON leads;
CREATE POLICY "Enable update access for all users" ON leads FOR UPDATE USING (true);
