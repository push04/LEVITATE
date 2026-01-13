-- ============================================
-- ADVANCED DASHBOARD UPDATE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add deal_value column for revenue tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS deal_value NUMERIC(12, 2) DEFAULT 0;

-- Optional: Add index for sorting by value
CREATE INDEX IF NOT EXISTS idx_leads_deal_value ON leads(deal_value);
