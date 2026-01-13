-- ============================================
-- ADD MANUAL CLIENT FIELDS TO LEADS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add new columns for manual entry
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS google_map_link TEXT,
ADD COLUMN IF NOT EXISTS website_link TEXT,
ADD COLUMN IF NOT EXISTS is_followup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web_form'; -- 'web_form' or 'manual_entry'

-- Update checks if needed (optional, keeping it simple for now)
-- The existing status check is: status IN ('New', 'Contacted', 'Closed')
-- We might want to add 'Follow Up' to the status enum constraint, but modifying check constraints is tricky in some SQL dialects without dropping.
-- For now, we'll use the is_followup boolean or map 'Follow Up' to 'Contacted' with the flag.

-- Let's try to update the constraint if possible to include 'Follow Up' nicely, 
-- or we can just stick to the existing statuses and use the boolean flag.
-- Actually, the user asked for "check boxes: contacted, followup". 
-- 'Contacted' is already a status. 'Followup' can be a status or a flag.
-- Let's drop and recreate the check constraint to be safe and cleaner for the UI.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('New', 'Contacted', 'Follow Up', 'Closed'));

-- Create index for quick filtering by source
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
